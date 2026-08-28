import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import {RpcClient} from '@subsquid/rpc-client'
import type {Runtime} from '@subsquid/substrate-runtime'
import {In} from 'typeorm'
import {convictionLabel} from './annotations'
import {BatchData, GovEvent} from './batch'
import {Delegation, DelegationAction, Referendum, ReferendumStatus, ReferendumTallySnapshot, Track, TreasurySpend, Vote, VoteAction} from './model'
import {storage} from './types'

const GOV_PALLETS = new Set(['Referenda', 'ConvictionVoting', 'Treasury', 'Scheduler'])

// twox128("Preimage") ++ twox128("PreimageFor"), the map uses the identity hasher
const PREIMAGE_FOR_PREFIX = '0xd8f314b7f4e6b095f0f8ee4656a448257c7dda85c9c297999fd02215e8c8f9de'
// pallet_referenda schedules enactment under blake2_256 of this tuple, the
// scheduler echoes the same id back on dispatch
const ASSEMBLY_ID = 'assembly'
const ENACTMENT = 'enactment'
const MAX_METADATA_BYTES = 16384
const MAX_TITLE_CHARS = 200

export function collectGovEvent(batch: BatchData, id: string, name: string, args: any, height: number, header: any, signer?: string, callArgs?: any): void {
    if (GOV_PALLETS.has(name.split('.')[0])) batch.govEvents.push({id, name, args, height, header, signer, callArgs})
}

export async function finalizeGovernance(ctx: {store: any}, batch: BatchData, lastHeader: any, rpc: RpcClient): Promise<void> {
    if (batch.govEvents.length > 0) {
        await loadTouchedReferenda(ctx, batch)
        await loadEnactments(ctx, batch)
        for (const ev of batch.govEvents) applyGovEvent(batch, ev, lastHeader._runtime)
        await applyMetadata(batch, rpc)
        await stampDelegatedWeights(batch)
        await logDelegationActions(ctx, batch)
        await snapshotTallies(ctx, batch)
    }
    await refreshOngoing(ctx, batch, lastHeader)
}

async function activeIssuanceAt(header: any): Promise<bigint> {
    const total = storage.balances.totalIssuance.v100
    const inactive = storage.balances.inactiveIssuance.v100
    if (!total.is(header) || !inactive.is(header)) throw new Error('unhandled spec version for issuance')
    const [t, i] = await Promise.all([total.get(header), inactive.get(header)])
    return (t ?? 0n) - (i ?? 0n)
}

// these events clear the referendum storage at their own block, the tally
// they carry is the last word
const END_EVENTS = new Set(['Confirmed', 'Rejected', 'TimedOut', 'Cancelled', 'Killed'])

// one row per poked referendum per poking block, read back from chain
// storage and never folded from the actions, delegated capital moves the
// tally without emitting any amount
async function snapshotTallies(ctx: {store: any}, batch: BatchData): Promise<void> {
    interface Point {
        header: any
        refs: Set<number>
        tracks: Set<number>
        ends: Map<number, any>
    }
    const points = new Map<number, Point>()
    const at = (ev: GovEvent): Point => {
        let p = points.get(ev.height)
        if (p == null) points.set(ev.height, (p = {header: ev.header, refs: new Set(), tracks: new Set(), ends: new Map()}))
        return p
    }
    for (const ev of batch.govEvents) {
        const [pallet, method] = ev.name.split('.')
        if (pallet === 'ConvictionVoting') {
            if (method === 'Voted' || method === 'VoteRemoved') at(ev).refs.add(ev.args.pollIndex)
            // the runtime appends the track to both delegation event tuples
            else if (method === 'Delegated') at(ev).tracks.add(Number(ev.args[2]))
            else if (method === 'Undelegated') at(ev).tracks.add(Number(ev.args[1]))
        } else if (pallet === 'Referenda') {
            if (method === 'DecisionStarted') at(ev).refs.add(ev.args.index)
            else if (END_EVENTS.has(method) && ev.args.tally != null) at(ev).ends.set(ev.args.index, ev.args.tally)
        }
    }
    if (points.size === 0) return

    const byTrack = new Map<number, Set<number>>()
    if ([...points.values()].some(p => p.tracks.size > 0)) {
        const open: Referendum[] = await ctx.store.find(Referendum, {
            where: {status: In([ReferendumStatus.SUBMITTED, ReferendumStatus.DECIDING, ReferendumStatus.CONFIRMING])},
            relations: {track: true},
        })
        for (const r of [...open, ...batch.referenda.values()]) {
            const track = Number(r.track.id)
            if (!byTrack.has(track)) byTrack.set(track, new Set())
            byTrack.get(track)!.add(r.index)
        }
    }

    const s = storage.referenda.referendumInfoFor.v100
    const issuanceByHeight = new Map<number, bigint>()
    const issuance = async (height: number, header: any): Promise<bigint> => {
        let v = issuanceByHeight.get(height)
        if (v == null) issuanceByHeight.set(height, (v = await activeIssuanceAt(header)))
        return v
    }
    const put = async (index: number, height: number, header: any, tally: any): Promise<void> => {
        const id = `${index}-${height}`
        batch.tallySnapshots.set(
            id,
            new ReferendumTallySnapshot({
                id,
                referendum: new Referendum({id: String(index)}),
                block: height,
                ayes: BigInt(tally.ayes),
                nays: BigInt(tally.nays),
                support: BigInt(tally.support),
                activeIssuance: await issuance(height, header),
            })
        )
    }
    for (const [height, p] of points) {
        for (const [index, tally] of p.ends) await put(index, height, p.header, tally)
        const indices = new Set(p.refs)
        for (const t of p.tracks) for (const idx of byTrack.get(t) ?? []) indices.add(idx)
        if (indices.size === 0) continue
        if (!s.is(p.header)) throw new Error(`unhandled spec version for referendum info at block ${height}`)
        const list = [...indices]
        const infos = await s.getMany(p.header, list)
        for (let i = 0; i < list.length; i++) {
            const info = infos[i]
            if (info?.__kind !== 'Ongoing') continue
            await put(list[i], height, p.header, info.value.tally)
        }
    }
}

// delegations ride a standard vote without any event of their own, the chain
// keeps their conviction weighted sum on the voter's casting record
async function stampDelegatedWeights(batch: BatchData): Promise<void> {
    if (batch.voteActions.length === 0) return
    const s = storage.convictionVoting.votingFor.v100
    const events = new Map(batch.govEvents.map(ev => [ev.id, ev]))
    for (const va of batch.voteActions) {
        if (va.decision !== 'aye' && va.decision !== 'nay') continue
        const ev = events.get(va.id)
        const r = batch.referenda.get(Number(va.referendum.id))
        if (ev == null || r == null) throw new Error(`no event or referendum behind vote action ${va.id}`)
        if (!s.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
        const v = await s.get(ev.header, va.voter.id, Number(r.track.id))
        if (v?.__kind === 'Casting') {
            va.delegatedCapital = v.value.delegations.capital
            va.delegatedVotes = v.value.delegations.votes
        }
    }
}

// delegate rows read the chain back after the block, undelegate rows keep
// values the chain already dropped, taken from this batch or the store
async function logDelegationActions(ctx: {store: any}, batch: BatchData): Promise<void> {
    const s = storage.convictionVoting.votingFor.v100
    const votesOn = async (header: any, target: string, track: number): Promise<bigint> => {
        const t = await s.get(header, target, track)
        return t?.__kind === 'Casting' ? t.value.delegations.votes : 0n
    }
    for (const ev of batch.govEvents) {
        const [pallet, method] = ev.name.split('.')
        if (pallet !== 'ConvictionVoting') continue
        if (method === 'Delegated') {
            const [who, , track] = ev.args as [string, string, number]
            if (!s.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
            const v = await s.get(ev.header, who, Number(track))
            if (v?.__kind !== 'Delegating') throw new Error(`no delegation behind Delegated at block ${ev.height}`)
            batch.delegationActions.push(
                new DelegationAction({
                    id: ev.id,
                    who: batch.touch(who, ev.height),
                    target: batch.touch(v.value.target, ev.height),
                    track: new Track({id: String(track)}),
                    kind: 'delegate',
                    balance: v.value.balance,
                    conviction: convictionLabel(v.value.conviction),
                    delegatedVotes: await votesOn(ev.header, v.value.target, Number(track)),
                    block: ev.height,
                })
            )
        } else if (method === 'Undelegated') {
            const [who, track] = ev.args as [string, number]
            if (!s.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
            const inBatch = [...batch.delegationActions].reverse().find(a => a.kind === 'delegate' && a.who.id === who && a.track.id === String(track))
            const stored: Delegation | undefined = inBatch
                ? undefined
                : await ctx.store.get(Delegation, {where: {id: `${who}-${track}`}, relations: {target: true}})
            const src = inBatch ?? stored
            if (src == null) throw new Error(`no delegation behind Undelegated at block ${ev.height}`)
            batch.delegationActions.push(
                new DelegationAction({
                    id: ev.id,
                    who: batch.touch(who, ev.height),
                    target: batch.touch(src.target.id, ev.height),
                    track: new Track({id: String(track)}),
                    kind: 'undelegate',
                    balance: src.balance,
                    conviction: src.conviction,
                    delegatedVotes: await votesOn(ev.header, src.target.id, Number(track)),
                    block: ev.height,
                })
            )
        }
    }
}

async function applyMetadata(batch: BatchData, rpc: RpcClient): Promise<void> {
    for (const ev of batch.govEvents) {
        if (ev.name !== 'Referenda.MetadataSet' && ev.name !== 'Referenda.MetadataCleared') continue
        const r = batch.referenda.get(ev.args.index)
        if (r == null) continue
        if (ev.name === 'Referenda.MetadataCleared') {
            r.title = null
            r.description = null
            continue
        }
        const meta = await fetchMetadataJson(rpc, ev.args.hash, ev.height)
        if (meta == null) continue
        r.title = meta.title
        r.description = meta.description
    }
}

// the convention is a noted preimage holding utf8 json {title, description}
async function fetchMetadataJson(rpc: RpcClient, hash: string, height: number): Promise<{title: string; description: string | null} | undefined> {
    const at = await rpc.call('chain_getBlockHash', [height])
    // the full key ends with the encoded (hash, len) pair, prefix scanning recovers len
    const keys: string[] = await rpc.call('state_getKeysPaged', [PREIMAGE_FOR_PREFIX + hash.slice(2), 1, null, at])
    if (keys == null || keys.length === 0) return undefined
    const raw: string | null = await rpc.call('state_getStorage', [keys[0], at])
    if (raw == null) return undefined
    const b = hexToBytes(raw.slice(2))
    const len = decodeCompact(b, 0)
    if (len == null || len.value > MAX_METADATA_BYTES) return undefined
    try {
        const parsed = JSON.parse(new TextDecoder().decode(b.subarray(len.next, len.next + Number(len.value))))
        if (typeof parsed?.title !== 'string' || parsed.title.length === 0) return undefined
        return {
            title: parsed.title.slice(0, MAX_TITLE_CHARS),
            description: typeof parsed.description === 'string' ? parsed.description : null,
        }
    } catch {
        return undefined
    }
}

function decodeCompact(b: Uint8Array, at: number): {value: bigint; next: number} | undefined {
    if (at >= b.length) return undefined
    const mode = b[at] & 0b11
    if (mode === 0b00) return {value: BigInt(b[at] >> 2), next: at + 1}
    if (mode === 0b01) {
        if (at + 2 > b.length) return undefined
        return {value: BigInt(b[at] | (b[at + 1] << 8)) >> 2n, next: at + 2}
    }
    if (mode === 0b10) {
        if (at + 4 > b.length) return undefined
        return {value: BigInt(b[at] + b[at + 1] * 0x100 + b[at + 2] * 0x10000 + b[at + 3] * 0x1000000) >> 2n, next: at + 4}
    }
    const n = (b[at] >> 2) + 4
    if (at + 1 + n > b.length) return undefined
    let value = 0n
    for (let i = n - 1; i >= 0; i--) value = (value << 8n) | BigInt(b[at + 1 + i])
    return {value, next: at + 1 + n}
}

// approve_bounty and its with_curator shortcut both name the bounty
function decodeApproveBounty(callHex: string, runtime: Runtime): number | undefined {
    const call = decodeCall(callHex, runtime)
    if (call?.name !== 'Bounties.approve_bounty' && call?.name !== 'Bounties.approve_bounty_with_curator') {
        return undefined
    }
    return Number(call.args.bountyId)
}

export function enactmentId(index: number): string {
    const idx = new Uint8Array(4)
    new DataView(idx.buffer).setUint32(0, index, true)
    // LockIdentifier is eight raw bytes, the str carries a compact length
    const parts = [Buffer.from(ASSEMBLY_ID), Buffer.from([ENACTMENT.length << 2]), Buffer.from(ENACTMENT), Buffer.from(idx)]
    const digest = blake2b.create({dkLen: 32}).update(new Uint8Array(Buffer.concat(parts))).digest()
    return '0x' + Buffer.from(digest).toString('hex')
}

// spend_local wraps the beneficiary in a MultiAddress while spend hands the
// account over bare, the chain's unit asset kind takes no bytes at all
function decodeSpend(callHex: string, runtime: Runtime): {call: string; amount: bigint; beneficiary: string} | undefined {
    const call = decodeCall(callHex, runtime)
    if (call?.name === 'Treasury.spend_local' && call.args.beneficiary?.__kind === 'Id') {
        return {call: 'treasury.spendLocal', amount: call.args.amount, beneficiary: call.args.beneficiary.value}
    }
    if (call?.name === 'Treasury.spend' && typeof call.args.beneficiary === 'string') {
        return {call: 'treasury.spend', amount: call.args.amount, beneficiary: call.args.beneficiary}
    }
    return undefined
}

/**
 * A preimage holds whatever bytes somebody paid to store, so anything that
 * does not read back as a call of this runtime is simply not one.
 */
function decodeCall(callHex: string, runtime: Runtime): {name: string; args: any} | undefined {
    try {
        return runtime.toCallRecord(runtime.decodeCall(callHex))
    } catch {
        return undefined
    }
}

async function loadTouchedReferenda(ctx: {store: any}, batch: BatchData): Promise<void> {
    const indices = new Set<number>()
    for (const ev of batch.govEvents) {
        const idx = ev.args?.index ?? ev.args?.pollIndex
        if (typeof idx === 'number') indices.add(idx)
    }
    if (indices.size === 0) return
    const rows: Referendum[] = await ctx.store.find(Referendum, {
        where: {index: In([...indices])},
        relations: {track: true},
    })
    for (const r of rows) batch.referenda.set(r.index, r)
}

// a dispatch names a task id, only approved referenda can own one
async function loadEnactments(ctx: {store: any}, batch: BatchData): Promise<void> {
    if (!batch.govEvents.some(e => e.name === 'Scheduler.Dispatched')) return
    const rows: Referendum[] = await ctx.store.find(Referendum, {where: {status: ReferendumStatus.APPROVED}, relations: {track: true}})
    for (const r of rows) {
        batch.enactments.set(enactmentId(r.index), r.index)
        if (!batch.referenda.has(r.index)) batch.referenda.set(r.index, r)
    }
}

function applyGovEvent(batch: BatchData, ev: GovEvent, runtime: Runtime): void {
    const [pallet, method] = ev.name.split('.')
    if (pallet === 'Referenda') applyReferendaEvent(batch, method, ev, runtime)
    else if (pallet === 'ConvictionVoting') applyVoteEvent(batch, method, ev)
    else if (pallet === 'Treasury') applyTreasuryEvent(batch, method, ev)
    else if (pallet === 'Scheduler' && method === 'Dispatched') applyDispatch(batch, ev)
}

function pushTimeline(r: Referendum, status: string, height: number): void {
    r.timeline = [...((r.timeline as any[]) ?? []), {status, block: height}]
}

// Referenda.submit args carry the origin as a nested variant, system origins
// one level deep and custom origins two
function originName(origin: any): string | undefined {
    return origin?.value?.__kind ?? origin?.__kind
}

function setTally(r: Referendum, tally: any): void {
    if (tally == null) return
    r.ayes = BigInt(tally.ayes)
    r.nays = BigInt(tally.nays)
    r.support = BigInt(tally.support)
}

function applyReferendaEvent(batch: BatchData, method: string, ev: GovEvent, runtime: Runtime): void {
    const args = ev.args
    if (method === 'Submitted') {
        const inline = args.proposal?.__kind === 'Inline' ? args.proposal.value : undefined
        const decoded = inline ? decodeSpend(inline, runtime) : undefined
        const bountyIndex = inline ? decodeApproveBounty(inline, runtime) : undefined
        const r = new Referendum({
            id: String(args.index),
            index: args.index,
            track: new Track({id: String(args.track)}),
            origin: originName(ev.callArgs?.proposalOrigin),
            proposalHash: proposalHash(args.proposal),
            proposalCall: decoded?.call ?? (bountyIndex != null ? 'bounties.approveBounty' : undefined),
            proposalAmount: decoded?.amount,
            proposalBeneficiary: decoded?.beneficiary,
            proposalBountyIndex: bountyIndex,
            submitter: ev.signer ? batch.touch(ev.signer, ev.height) : undefined,
            submittedAt: ev.height,
            status: ReferendumStatus.SUBMITTED,
            ayes: 0n,
            nays: 0n,
            support: 0n,
            timeline: [],
        })
        pushTimeline(r, 'submitted', ev.height)
        batch.referenda.set(r.index, r)
        return
    }
    const r = batch.referenda.get(args.index)
    if (r == null) return
    switch (method) {
        case 'DecisionDepositPlaced':
            r.decisionDepositor = args.who
            r.decisionDeposit = BigInt(args.amount)
            pushTimeline(r, 'decision deposit placed', ev.height)
            break
        case 'DecisionStarted':
            r.status = ReferendumStatus.DECIDING
            r.decidingSince = ev.height
            setTally(r, args.tally)
            pushTimeline(r, 'deciding', ev.height)
            break
        case 'ConfirmStarted':
            r.status = ReferendumStatus.CONFIRMING
            r.confirmingSince = ev.height
            pushTimeline(r, 'confirming', ev.height)
            break
        case 'ConfirmAborted':
            r.status = ReferendumStatus.DECIDING
            r.confirmingSince = null
            pushTimeline(r, 'confirm aborted', ev.height)
            break
        case 'Confirmed':
            setTally(r, args.tally)
            pushTimeline(r, 'confirmed', ev.height)
            break
        case 'Approved':
            r.status = ReferendumStatus.APPROVED
            r.endedAt = ev.height
            pushTimeline(r, 'approved', ev.height)
            break
        case 'Rejected':
            r.status = ReferendumStatus.REJECTED
            r.endedAt = ev.height
            setTally(r, args.tally)
            pushTimeline(r, 'rejected', ev.height)
            break
        case 'TimedOut':
            r.status = ReferendumStatus.TIMEDOUT
            r.endedAt = ev.height
            setTally(r, args.tally)
            pushTimeline(r, 'timed out', ev.height)
            break
        case 'Cancelled':
            r.status = ReferendumStatus.CANCELLED
            r.endedAt = ev.height
            setTally(r, args.tally)
            pushTimeline(r, 'cancelled', ev.height)
            break
        case 'Killed':
            r.status = ReferendumStatus.KILLED
            r.endedAt = ev.height
            setTally(r, args.tally)
            pushTimeline(r, 'killed', ev.height)
            // a kill slashes both deposits
            r.submissionDepositor = null
            r.submissionDeposit = null
            r.decisionDepositor = null
            r.decisionDeposit = null
            break
        // a deposit outlives the referendum, storage only stops naming it once
        // the depositor claims it back
        case 'SubmissionDepositRefunded':
            r.submissionDepositor = null
            r.submissionDeposit = null
            pushTimeline(r, 'submission deposit refunded', ev.height)
            break
        case 'DecisionDepositRefunded':
            r.decisionDepositor = null
            r.decisionDeposit = null
            pushTimeline(r, 'decision deposit refunded', ev.height)
            break
    }
}

function proposalHash(proposal: any): string | undefined {
    if (proposal?.__kind === 'Lookup') return proposal.hash
    if (proposal?.__kind === 'Inline') return '0x' + bytesToHex(blake2b(hexToBytes(proposal.value.slice(2)), {dkLen: 32}))
    return undefined
}

function applyVoteEvent(batch: BatchData, method: string, ev: GovEvent): void {
    if (method !== 'Voted' && method !== 'VoteRemoved') return
    const {who, vote, pollIndex} = ev.args
    const decoded = decodeAccountVote(vote)
    if (decoded == null) return
    const id = `${pollIndex}-${who}`
    batch.votes.set(
        id,
        new Vote({
            id,
            referendum: new Referendum({id: String(pollIndex)}),
            voter: batch.touch(who, ev.height),
            decision: decoded.decision,
            amount: decoded.amount,
            conviction: decoded.conviction,
            block: ev.height,
            removed: method === 'VoteRemoved',
        })
    )
    batch.voteActions.push(
        new VoteAction({
            id: ev.id,
            referendum: new Referendum({id: String(pollIndex)}),
            voter: batch.touch(who, ev.height),
            kind: method === 'Voted' ? 'vote' : 'remove',
            decision: decoded.decision,
            amount: decoded.amount,
            conviction: decoded.conviction,
            delegatedCapital: 0n,
            delegatedVotes: 0n,
            block: ev.height,
        })
    )
}

function decodeAccountVote(vote: any): {decision: string; amount: bigint; conviction?: string} | undefined {
    if (vote?.__kind === 'Standard') {
        const v = Number(vote.vote)
        return {
            decision: (v & 0x80) !== 0 ? 'aye' : 'nay',
            amount: BigInt(vote.balance),
            conviction: `${v & 0x7f}x`,
        }
    }
    if (vote?.__kind === 'Split') {
        return {decision: 'split', amount: BigInt(vote.aye) + BigInt(vote.nay)}
    }
    if (vote?.__kind === 'SplitAbstain') {
        return {decision: 'abstain', amount: BigInt(vote.aye) + BigInt(vote.nay) + BigInt(vote.abstain)}
    }
    return undefined
}

// the dispatched call emits its own events first, so whatever spends landed
// at this height since the last dispatch belong to this referendum
function applyDispatch(batch: BatchData, ev: GovEvent): void {
    const id = ev.args?.id
    const pending = batch.spendsAtHeight.get(ev.height) ?? []
    batch.spendsAtHeight.set(ev.height, [])
    if (typeof id !== 'string') return
    const index = batch.enactments.get(id)
    if (index == null) return
    const r = batch.referenda.get(index)
    if (r != null) pushTimeline(r, 'enacted', ev.height)
    for (const spendId of pending) {
        const s = batch.spends.get(spendId)
        if (s != null) s.referendum = new Referendum({id: String(index)})
    }
}

function applyTreasuryEvent(batch: BatchData, method: string, ev: GovEvent): void {
    const args = ev.args
    switch (method) {
        case 'SpendApproved': {
            const id = `local-${args.proposalIndex}`
            batch.spendsAtHeight.set(ev.height, [...(batch.spendsAtHeight.get(ev.height) ?? []), id])
            batch.spends.set(
                id,
                new TreasurySpend({
                    id,
                    kind: 'local',
                    beneficiary: batch.touch(args.beneficiary, ev.height),
                    amount: BigInt(args.amount),
                    status: 'approved',
                    block: ev.height,
                })
            )
            break
        }
        case 'Awarded': {
            const id = `local-${args.proposalIndex}`
            const s = batch.spends.get(id)
            if (s != null) {
                s.status = 'paid'
            } else {
                batch.spends.set(
                    id,
                    new TreasurySpend({
                        id,
                        kind: 'local',
                        beneficiary: batch.touch(args.account, ev.height),
                        amount: BigInt(args.award),
                        status: 'paid',
                        block: ev.height,
                    })
                )
            }
            break
        }
        case 'AssetSpendApproved': {
            const id = `spend-${args.index}`
            batch.spends.set(
                id,
                new TreasurySpend({
                    id,
                    kind: 'spend',
                    beneficiary: typeof args.beneficiary === 'string' ? batch.touch(args.beneficiary, ev.height) : undefined,
                    amount: BigInt(args.amount),
                    status: 'approved',
                    block: ev.height,
                })
            )
            break
        }
        case 'Paid': {
            const id = `spend-${args.index}`
            const s = batch.spends.get(id)
            if (s != null) s.status = 'paid'
            break
        }
    }
}

async function refreshOngoing(ctx: {store: any}, batch: BatchData, lastHeader: any): Promise<void> {
    const open: Referendum[] = await ctx.store.find(Referendum, {
        where: {status: In([ReferendumStatus.SUBMITTED, ReferendumStatus.DECIDING, ReferendumStatus.CONFIRMING])},
        relations: {track: true},
    })
    const all = new Map<number, Referendum>()
    for (const r of open) all.set(r.index, r)
    for (const [idx, r] of batch.referenda) all.set(idx, r)
    if (all.size === 0) return
    const s = storage.referenda.referendumInfoFor.v100
    if (!s.is(lastHeader)) throw new Error('unhandled spec version for referendum info')
    const indices = [...all.keys()]
    const infos = await s.getMany(lastHeader, indices)
    indices.forEach((idx, i) => {
        const info = infos[i]
        const r = all.get(idx)!
        if (info?.__kind !== 'Ongoing') return
        setTally(r, info.value.tally)
        r.submissionDepositor = info.value.submissionDeposit.who
        r.submissionDeposit = info.value.submissionDeposit.amount
        r.decisionDepositor = info.value.decisionDeposit?.who ?? null
        r.decisionDeposit = info.value.decisionDeposit?.amount ?? null
        if (info.value.deciding != null) {
            r.decidingSince = info.value.deciding.since
            r.confirmingSince = info.value.deciding.confirming ?? undefined
        }
        batch.referenda.set(idx, r)
    })
}
