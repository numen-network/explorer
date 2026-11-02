import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import {RpcClient} from '@subsquid/rpc-client'
import {Src} from '@subsquid/scale-codec'
import {toJSON} from '@subsquid/util-internal-json'
import type {Runtime} from '@subsquid/substrate-runtime'
import {In, IsNull, Not} from 'typeorm'
import {BatchData, GovEvent} from './batch'
import {Account, Block, Call as CallRow, CallKind, Delegate, DelegateTrack, DelegatedVote, DelegatedVoteAction, Delegation, DelegationAction, Extrinsic, MetadataAction, Preimage, Referendum, ReferendumDeposit, ReferendumDepositKind, ReferendumDepositState, ReferendumStatus, ReferendumTallySnapshot, RuntimeCode, Track, TreasuryPayout, TreasuryPayoutRole, TreasuryPayoutSource, TreasurySpend, Vote, VotingAction} from './model'
import {convictionVotes, lockPeriods, ownVotes} from './conviction'
import {readRuntime} from './runtimeCode'
import {decodeUtf8} from './utf8'
import {constants, storage} from './types'
import type {AccountVote, DispatchTime, RequestStatus} from './types/v100'

const GOV_PALLETS = new Set(['Referenda', 'ConvictionVoting', 'Treasury', 'Scheduler', 'Preimage'])
const PREIMAGE_CLEARED = 'Cleared'

// twox128("Preimage") ++ twox128("PreimageFor"), the map uses the identity hasher
const PREIMAGE_FOR_PREFIX = '0xd8f314b7f4e6b095f0f8ee4656a448257c7dda85c9c297999fd02215e8c8f9de'
// pallet_referenda schedules enactment under blake2_256 of this tuple, the
// scheduler echoes the same id back on dispatch
const ASSEMBLY_ID = 'assembly'
const ENACTMENT = 'enactment'
const BATCH_CALLS = new Set(['Utility.batch', 'Utility.batch_all', 'Utility.force_batch'])
// a preimage is bytes somebody paid to store, so a proposal nests as deep as it
// likes and the walk has to stop on its own
const MAX_PROPOSAL_DEPTH = 4

const stampOf = (ev: GovEvent) => new Date(ev.header.timestamp)

export function collectGovEvent(batch: BatchData, id: string, indexInBlock: number, name: string, args: any, height: number, header: any, origin?: string, callArgs?: any, extrinsic?: string): void {
    if (GOV_PALLETS.has(name.split('.')[0])) batch.govEvents.push({id, indexInBlock, name, args, height, header, origin, callArgs, extrinsic})
}

export async function finalizeGovernance(ctx: {store: any}, batch: BatchData, lastHeader: any, rpc: RpcClient): Promise<void> {
    const preimages = await followPreimages(ctx, batch, rpc)
    if (batch.govEvents.length > 0) {
        await loadTouchedReferenda(ctx, batch)
        await loadEnactments(ctx, batch)
        await loadTouchedSpends(ctx, batch)
        const locks = await loadVoteLocks(ctx, batch)
        for (const ev of batch.govEvents) {
            applyGovEvent(batch, ev)
            stampVoteLock(batch, locks, ev)
        }
        await scheduleEnactments(batch)
        const stray = batch.revocations[0]
        if (stray) throw new Error(`${stray.step.name} at block ${stray.height} matches no enactment`)
        await applyProposals(batch, rpc)
        await recordEnactedCalls(batch, rpc)
        matchEnactedSpends(batch)
        await applyMetadata(batch, rpc)
        const folded = await logVotingActions(ctx, batch)
        await snapshotTallies(ctx, batch)
        await reconcileTallies(ctx, batch, folded)
    }
    await refreshOngoing(ctx, batch, lastHeader)
    await refreshPreimages(batch, preimages, lastHeader)
}

async function issuanceAt(header: any): Promise<{total: bigint; inactive: bigint}> {
    const total = storage.balances.totalIssuance.v100
    const inactive = storage.balances.inactiveIssuance.v100
    if (!total.is(header) || !inactive.is(header)) throw new Error('unhandled spec version for issuance')
    const [t, i] = await Promise.all([total.get(header), inactive.get(header)])
    return {total: t ?? total.getDefault(header), inactive: i ?? inactive.getDefault(header)}
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
            where: {status: ReferendumStatus.Ongoing},
            relations: {track: true},
        })
        for (const r of [...open, ...batch.referenda.values()]) {
            const track = Number(r.track.id)
            if (!byTrack.has(track)) byTrack.set(track, new Set())
            byTrack.get(track)!.add(r.index)
        }
    }

    const s = storage.referenda.referendumInfoFor.v100
    const issuanceByHeight = new Map<number, {total: bigint; inactive: bigint}>()
    const issuance = async (height: number, header: any) => {
        let v = issuanceByHeight.get(height)
        if (v == null) issuanceByHeight.set(height, (v = await issuanceAt(header)))
        return v
    }
    const put = async (index: number, height: number, header: any, tally: any): Promise<void> => {
        const id = `${index}-${height}`
        const {total, inactive} = await issuance(height, header)
        batch.tallySnapshots.set(
            id,
            new ReferendumTallySnapshot({
                id,
                referendum: new Referendum({id: String(index)}),
                block: height,
                ayes: BigInt(tally.ayes),
                nays: BigInt(tally.nays),
                support: BigInt(tally.support),
                totalIssuance: total,
                inactiveIssuance: inactive,
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

interface StandingVote {
    track: string
    vote: AccountVoteFields
}

interface Delegated {
    conviction: string
    balance: bigint
}

const VOTE_EVENTS = new Set(['ConvictionVoting.Voted', 'ConvictionVoting.VoteRemoved'])

// a vote moves the tally on its own, a delegation change only through the
// standard votes its target holds on open referenda, so the events replay in
// order over those votes as the batch found them. the same replay keeps the
// delegations each open referendum counts and folds each event's move into
// the tally, returning each referendum's tally as every block left it
async function logVotingActions(ctx: {store: any}, batch: BatchData): Promise<Map<string, Tally>> {
    const targets = await delegationTargets(ctx, batch)
    const voters = new Set([...targets.values(), ...batch.govEvents.filter(ev => VOTE_EVENTS.has(ev.name)).map(ev => ev.args.who as string)])
    const standing = await standingVotes(ctx, voters)
    const delegations = await delegationsTo(ctx, voters)
    const delegatedTo = (who: string, track: string): Delegations => {
        let sum = NO_DELEGATIONS
        for (const d of delegationsOn(delegations, who, track).values()) sum = addDelegations(sum, delegationsOf(d))
        return sum
    }
    const tallies = new Map<number, Tally>()
    const folded = new Map<string, Tally>()
    const tallyOf = async (index: number): Promise<Tally> => tallies.get(index) ?? (await latestSnapshot(ctx, String(index))) ?? EMPTY_TALLY
    const weights = new Map<string, bigint>()
    // the chain keeps the conviction weighted sum of the delegations on the
    // voter's casting record, read here as the block left it
    const delegatedVotes = async (ev: GovEvent, voter: string, track: string): Promise<bigint> => {
        const key = `${ev.height}-${voter}-${track}`
        let votes = weights.get(key)
        if (votes == null) {
            const s = storage.convictionVoting.votingFor.v100
            if (!s.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
            const voting = await s.get(ev.header, voter, Number(track))
            weights.set(key, (votes = voting?.__kind === 'Casting' ? voting.value.delegations.votes : 0n))
        }
        return votes
    }
    // a row on a closed referendum or behind an unknown delegation moved nothing it can show
    const log = async (ev: GovEvent, index: number, voter: string, delegator: string | null, {track, vote}: StandingVote, moved: Tally | null): Promise<void> => {
        let impact: Impact = NO_IMPACT
        if (moved != null) {
            const before = await tallyOf(index)
            const after = addTally(before, moved)
            tallies.set(index, after)
            folded.set(`${index}-${ev.height}`, after)
            impact = impactOf(before, after)
        }
        batch.votingActions.push(
            new VotingAction({
                id: `${index}-${ev.id}`,
                referendum: new Referendum({id: String(index)}),
                voter: batch.touch(voter, ev.height),
                delegator: delegator == null ? null : batch.touch(delegator, ev.height),
                method: ev.name.split('.')[1],
                ...vote,
                delegatedVotes: await delegatedVotes(ev, voter, track),
                ...impact,
                block: ev.height,
                indexInBlock: ev.indexInBlock,
                timestamp: stampOf(ev),
            })
        )
    }
    for (const ev of batch.govEvents) {
        const [pallet, method] = ev.name.split('.')
        if (pallet === 'Referenda' && END_EVENTS.has(method)) {
            for (const held of standing.values()) held.delete(ev.args.index)
        } else if (VOTE_EVENTS.has(ev.name)) {
            const {who, vote, pollIndex} = ev.args
            const decoded = decodeAccountVote(vote)
            if (decoded == null) continue
            const r = batch.referenda.get(pollIndex)
            if (r == null) throw new Error(`no referendum behind the vote at block ${ev.height}`)
            const cast = {track: r.track.id, vote: decoded}
            const held = standing.get(who)!
            const prior = held.get(pollIndex)
            const standard = method === 'Voted' && decoded.kind === 'Standard'
            // a standard vote carries every delegation its voter holds on the
            // track, taking the vote off or splitting it drops them
            if (standard || prior?.vote.kind === 'Standard') for (const [d, delegated] of delegationsOn(delegations, who, cast.track)) countDelegation(batch, ev, pollIndex, who, d, delegated, (standard ? decoded : prior!.vote).aye!, !standard)
            if (method === 'Voted') held.set(pollIndex, cast)
            else held.delete(pollIndex)
            // a vote taken off a closed referendum is the only one with nothing standing behind it
            const behind = delegatedTo(who, cast.track)
            const off = prior == null ? EMPTY_TALLY : weightOf(prior.vote, behind)
            const moved = method === 'Voted' ? subTally(weightOf(decoded, behind), off) : prior == null ? null : subTally(EMPTY_TALLY, off)
            await log(ev, pollIndex, who, null, cast, moved)
        } else if (pallet === 'ConvictionVoting' && (method === 'Delegated' || method === 'Undelegated')) {
            const who: string = ev.args[0]
            const track = String(method === 'Delegated' ? ev.args[2] : ev.args[1])
            const target = targets.get(ev.id)!
            const onTarget = delegationsOn(delegations, target, track)
            const delegated = method === 'Delegated' ? await delegationAt(ev, who, target, track) : onTarget.get(who)
            if (method === 'Undelegated') onTarget.delete(who)
            else if (delegated != null) onTarget.set(who, delegated)
            batch.delegationActions.push(
                new DelegationAction({
                    id: ev.id,
                    who: batch.touch(who, ev.height),
                    target: new Account({id: target}),
                    track: new Track({id: track}),
                    method,
                    conviction: delegated?.conviction ?? null,
                    balance: delegated?.balance ?? null,
                    block: ev.height,
                    indexInBlock: ev.indexInBlock,
                    timestamp: stampOf(ev),
                })
            )
            for (const [index, held] of standing.get(target)!) {
                if (held.track !== track || held.vote.kind !== 'Standard') continue
                const moved = delegated == null ? null : sideOf(held.vote.aye!, delegationsOf(delegated))
                await log(ev, index, target, who, held, method === 'Undelegated' && moved != null ? subTally(EMPTY_TALLY, moved) : moved)
                if (delegated != null) countDelegation(batch, ev, index, target, who, delegated, held.vote.aye!, method === 'Undelegated')
            }
        }
    }
    return folded
}

// a referendum counts a delegation while its target holds a standard vote
// there, so the row follows both the vote and the delegation
function countDelegation(batch: BatchData, ev: GovEvent, index: number, voter: string, delegator: string, {conviction, balance}: Delegated, aye: boolean, removed: boolean): void {
    const id = `${index}-${delegator}`
    const counted = {
        referendum: new Referendum({id: String(index)}),
        voter: batch.touch(voter, ev.height),
        delegator: batch.touch(delegator, ev.height),
        aye,
        conviction,
        balance,
        votes: convictionVotes(conviction, balance),
        removed,
        block: ev.height,
    }
    batch.delegatedVotes.set(id, new DelegatedVote({id, ...counted}))
    batch.delegatedVoteActions.push(new DelegatedVoteAction({id: `${index}-${ev.id}-${delegator}`, ...counted, method: ev.name.split('.')[1], indexInBlock: ev.indexInBlock, timestamp: stampOf(ev)}))
}

// the delegations an account has received on a track, by delegator
function delegationsOn(all: Map<string, Map<string, Delegated>>, target: string, track: string): Map<string, Delegated> {
    const key = `${target}-${track}`
    let on = all.get(key)
    if (on == null) all.set(key, (on = new Map()))
    return on
}

// the delegations each account has received, as the batch begins
async function delegationsTo(ctx: {store: any}, accounts: Set<string>): Promise<Map<string, Map<string, Delegated>>> {
    const out = new Map<string, Map<string, Delegated>>()
    if (accounts.size === 0) return out
    const rows: Delegation[] = await ctx.store.find(Delegation, {where: {target: {id: In([...accounts])}}, relations: {who: true, target: true, track: true}})
    for (const d of rows) delegationsOn(out, d.target.id, d.track.id).set(d.who.id, {conviction: d.conviction, balance: d.balance})
    return out
}

// runs after the account merge, which swaps the drafts for the stored rows
export async function totalAccountVotes(ctx: {store: any}, batch: BatchData): Promise<void> {
    const moved = new Set([...batch.votes.values()].map(v => v.voter.id))
    for (const d of batch.delegatedVotes.values()) moved.add(d.voter.id).add(d.delegator.id)
    const accounts = new Map([...moved].flatMap(id => (batch.accounts.has(id) ? [[id, batch.accounts.get(id)!] as const] : [])))
    if (accounts.size === 0) return
    const ids = [...accounts.keys()]
    const [votes, delegated]: [Vote[], DelegatedVote[]] = await Promise.all([
        ctx.store.find(Vote, {where: {voter: {id: In(ids)}}, relations: {voter: true}}),
        ctx.store.find(DelegatedVote, {where: [{voter: {id: In(ids)}}, {delegator: {id: In(ids)}}], relations: {voter: true, delegator: true}}),
    ])
    const standing = <T extends {id: string; removed: boolean}>(stored: T[], latest: Map<string, T>) => [...new Map([...stored.map(r => [r.id, r] as const), ...latest]).values()].filter(r => !r.removed)
    for (const a of accounts.values()) a.ownVotes = a.receivedVotes = a.delegatedVotes = 0n
    for (const v of standing(votes, batch.votes)) {
        const a = accounts.get(v.voter.id)
        if (a != null) a.ownVotes += v.votes
    }
    for (const d of standing(delegated, batch.delegatedVotes)) {
        const to = accounts.get(d.voter.id)
        if (to != null) to.receivedVotes += d.votes
        const from = accounts.get(d.delegator.id)
        if (from != null) from.delegatedVotes += d.votes
    }
}

// a delegation that moves leaves its old target and joins its new one, so the
// old targets are read before the batch's delegations land
export async function movedDelegates(ctx: {store: any}, batch: BatchData): Promise<Set<string>> {
    const ids = [...batch.delegations.map(d => d.id), ...batch.delegationRemovals]
    const old: Delegation[] = ids.length > 0 ? await ctx.store.find(Delegation, {where: {id: In(ids)}, relations: {target: true}}) : []
    return new Set([...old, ...batch.delegations].map(d => d.target.id))
}

export async function refreshDelegates(ctx: {store: any}, targets: Set<string>): Promise<void> {
    if (targets.size === 0) return
    const ids = [...targets]
    const [rows, stale]: [Delegation[], DelegateTrack[]] = await Promise.all([
        ctx.store.find(Delegation, {where: {target: {id: In(ids)}}, relations: {who: true, target: true, track: true}}),
        ctx.store.find(DelegateTrack, {where: {delegate: {id: In(ids)}}}),
    ])
    const on = new Map<string, Delegation[]>()
    for (const d of rows) on.set(d.target.id, [...(on.get(d.target.id) ?? []), d])
    const totals = [...on].map(([id, ds]) => ({id, tracks: trackTotals(id, ds)}))
    await ctx.store.upsert(totals.map(({id, tracks}) => delegateOf(id, on.get(id)!, tracks)))
    const kept = totals.flatMap(t => t.tracks)
    await ctx.store.upsert(kept)
    const keptIds = new Set(kept.map(t => t.id))
    const dropped = stale.filter(t => !keptIds.has(t.id)).map(t => t.id)
    if (dropped.length > 0) await ctx.store.remove(DelegateTrack, dropped)
    const gone = ids.filter(id => !on.has(id))
    if (gone.length > 0) await ctx.store.remove(Delegate, gone)
}

function trackTotals(delegate: string, ds: Delegation[]): DelegateTrack[] {
    const byTrack = new Map<string, DelegateTrack>()
    for (const d of ds) {
        const id = `${delegate}-${d.track.id}`
        const t = byTrack.get(id) ?? new DelegateTrack({id, delegate: new Delegate({id: delegate}), track: new Track({id: d.track.id}), delegators: 0, capital: 0n, votes: 0n})
        t.delegators += 1
        t.capital += d.balance
        t.votes += d.votes
        byTrack.set(id, t)
    }
    return [...byTrack.values()]
}

function delegateOf(id: string, ds: Delegation[], tracks: DelegateTrack[]): Delegate {
    const most = new Map<string, bigint>()
    for (const d of ds) {
        const seen = most.get(d.who.id) ?? 0n
        most.set(d.who.id, d.balance > seen ? d.balance : seen)
    }
    return new Delegate({
        id,
        account: new Account({id}),
        delegators: most.size,
        tracks: tracks.length,
        delegated: [...most.values()].reduce((sum, b) => sum + b, 0n),
        maxTrackVotes: tracks.reduce((max, t) => (t.votes > max ? t.votes : max), 0n),
    })
}

// the delegation as its block left it, nothing when the same block undid it
async function delegationAt(ev: GovEvent, who: string, target: string, track: string): Promise<Delegated | undefined> {
    const s = storage.convictionVoting.votingFor.v100
    if (!s.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
    const voting = await s.get(ev.header, who, Number(track))
    if (voting?.__kind !== 'Delegating' || voting.value.target !== target) return undefined
    return {conviction: voting.value.conviction.__kind, balance: voting.value.balance}
}

// the runtime appends the track to both delegation event tuples, an
// undelegate names no target and ends the delegation set up last
async function delegationTargets(ctx: {store: any}, batch: BatchData): Promise<Map<string, string>> {
    const latest = new Map<string, string>()
    const targets = new Map<string, string>()
    for (const ev of batch.govEvents) {
        if (ev.name === 'ConvictionVoting.Delegated') {
            const [who, target, track] = ev.args as [string, string, number]
            latest.set(`${who}-${track}`, target)
            targets.set(ev.id, target)
        } else if (ev.name === 'ConvictionVoting.Undelegated') {
            const [who, track] = ev.args as [string, number]
            const id = `${who}-${track}`
            const target: string | undefined = latest.get(id) ?? (await ctx.store.get(Delegation, {where: {id}, relations: {target: true}}))?.target.id
            if (target == null) throw new Error(`no delegation behind Undelegated at block ${ev.height}`)
            targets.set(ev.id, target)
        }
    }
    return targets
}

// the votes each account holds on open referenda as the batch begins
async function standingVotes(ctx: {store: any}, accounts: Set<string>): Promise<Map<string, Map<number, StandingVote>>> {
    const out = new Map([...accounts].map(a => [a, new Map<number, StandingVote>()]))
    if (accounts.size === 0) return out
    const votes: Vote[] = await ctx.store.find(Vote, {
        where: {voter: {id: In([...accounts])}, removed: false, referendum: {status: ReferendumStatus.Ongoing}},
        relations: {voter: true, referendum: {track: true}},
    })
    for (const v of votes) out.get(v.voter.id)!.set(v.referendum.index, {track: v.referendum.track.id, vote: voteFields(v)})
    return out
}

interface Tally {
    ayes: bigint
    nays: bigint
    support: bigint
}

interface Delegations {
    votes: bigint
    capital: bigint
}

type Impact = Pick<VotingAction, 'approvalPart' | 'approvalWhole' | 'supportPart' | 'supportWhole'>

const EMPTY_TALLY: Tally = {ayes: 0n, nays: 0n, support: 0n}
const NO_DELEGATIONS: Delegations = {votes: 0n, capital: 0n}
const NO_IMPACT: Impact = {approvalPart: null, approvalWhole: null, supportPart: null, supportWhole: null}

const addTally = (a: Tally, b: Tally): Tally => ({ayes: a.ayes + b.ayes, nays: a.nays + b.nays, support: a.support + b.support})
const subTally = (a: Tally, b: Tally): Tally => ({ayes: a.ayes - b.ayes, nays: a.nays - b.nays, support: a.support - b.support})
const sameTally = (a: Tally, b: Tally) => a.ayes === b.ayes && a.nays === b.nays && a.support === b.support
const addDelegations = (a: Delegations, b: Delegations): Delegations => ({votes: a.votes + b.votes, capital: a.capital + b.capital})
const delegationsOf = ({conviction, balance}: Delegated): Delegations => ({votes: convictionVotes(conviction, balance), capital: balance})

// conviction weighted votes land on their side, the capital only counts toward support on aye
const sideOf = (aye: boolean, {votes, capital}: Delegations): Tally => (aye ? {ayes: votes, nays: 0n, support: capital} : {ayes: 0n, nays: votes, support: 0n})

// what a vote puts on a tally as pallet_conviction_voting counts it, a split
// part weighs as no conviction and a standard vote carries the delegations
// behind its voter
function weightOf(v: AccountVoteFields, delegated: Delegations): Tally {
    switch (v.kind) {
        case 'Standard':
            return sideOf(v.aye!, addDelegations(delegationsOf({conviction: v.conviction!, balance: v.balance!}), delegated))
        case 'Split':
            return addTally(sideOf(true, delegationsOf({conviction: 'None', balance: v.ayeAmount!})), sideOf(false, delegationsOf({conviction: 'None', balance: v.nayAmount!})))
        case 'SplitAbstain':
            return addTally(weightOf({...v, kind: 'Split'}, NO_DELEGATIONS), {ayes: 0n, nays: 0n, support: v.abstainAmount!})
    }
    throw new Error(`unhandled vote kind ${v.kind}`)
}

// supportWhole needs the block's issuance, which the snapshot reads
function impactOf(before: Tally, after: Tally): Impact {
    const [a1, n1] = approvalOf(after)
    const [a0, n0] = approvalOf(before)
    return {approvalPart: a1 * n0 - a0 * n1, approvalWhole: n1 * n0, supportPart: after.support - before.support, supportWhole: null}
}

// approval as a fraction of the votes cast, none cast reading as none approving
function approvalOf({ayes, nays}: Tally): [part: bigint, whole: bigint] {
    const cast = ayes + nays
    return cast > 0n ? [ayes, cast] : [0n, 1n]
}

const latestSnapshot = (ctx: {store: any}, ref: string): Promise<ReferendumTallySnapshot | undefined> =>
    ctx.store.findOne(ReferendumTallySnapshot, {where: {referendum: {id: ref}}, order: {block: 'DESC'}})

// the folded tally has to land on what the chain kept at the end of every
// block, anything else means the replay missed a rule
async function reconcileTallies(ctx: {store: any}, batch: BatchData, folded: Map<string, Tally>): Promise<void> {
    const rows = new Map<string, VotingAction[]>()
    for (const a of batch.votingActions) {
        if (a.supportPart == null) continue
        const id = `${a.referendum.id}-${a.block}`
        rows.set(id, [...(rows.get(id) ?? []), a])
    }
    const before = new Map<string, Tally>()
    for (const now of [...batch.tallySnapshots.values()].sort((x, y) => x.block - y.block)) {
        const ref = now.referendum.id
        const want = folded.get(now.id) ?? before.get(ref) ?? (await latestSnapshot(ctx, ref)) ?? EMPTY_TALLY
        if (!sameTally(now, want)) throw new Error(`folded tally of referendum ${ref} drifts from the chain at block ${now.block}`)
        for (const a of rows.get(now.id) ?? []) a.supportWhole = now.totalIssuance - now.inactiveIssuance
        rows.delete(now.id)
        before.set(ref, now)
    }
    const [orphan] = rows.keys()
    if (orphan != null) throw new Error(`no tally snapshot behind the actions on ${orphan}`)
}

// the referendum row keeps only the latest text, every set and clear also
// lands in the action log so earlier versions stay readable
async function applyMetadata(batch: BatchData, rpc: RpcClient): Promise<void> {
    for (const ev of batch.govEvents) {
        if (ev.name !== 'Referenda.MetadataSet' && ev.name !== 'Referenda.MetadataCleared') continue
        const r = batch.referenda.get(ev.args.index)
        if (r == null) continue
        const cleared = ev.name === 'Referenda.MetadataCleared'
        const bytes = cleared ? undefined : await fetchPreimage(rpc, ev.args.hash, ev.height)
        const meta = bytes ? readMetadataText(bytes) : {title: null, description: null}
        r.title = meta.title
        r.description = meta.description
        batch.metadataActions.push(
            new MetadataAction({
                id: ev.id,
                referendum: new Referendum({id: String(ev.args.index)}),
                method: ev.name.split('.')[1],
                hash: ev.args.hash,
                preimage: batch.preimageAt.get(ev.id) ?? null,
                title: meta.title,
                description: meta.description,
                block: ev.height,
                timestamp: stampOf(ev),
            })
        )
    }
}

// walks the store's events in order, a row stays open from the Noted or
// Requested that opened it to its Cleared, and each referendum reference lands
// on the row open at that moment. returns the rows left open, by hash
async function followPreimages(ctx: {store: any}, batch: BatchData, rpc: RpcClient): Promise<Map<string, Preimage>> {
    const stored: Preimage[] = await ctx.store.find(Preimage, {where: {status: Not(PREIMAGE_CLEARED)}, relations: {depositor: true}})
    const open = new Map(stored.map(p => [p.hash, p]))
    for (const ev of batch.govEvents) {
        if (ev.name === 'Preimage.Noted' || ev.name === 'Preimage.Requested') {
            const row = open.get(ev.args.hash) ?? openPreimage(ev)
            open.set(row.hash, row)
            batch.preimages.set(row.id, row)
            if (ev.name === 'Preimage.Noted') await notePreimage(batch, row, ev, rpc)
        } else if (ev.name === 'Preimage.Cleared') {
            const row = open.get(ev.args.hash)
            if (row == null) throw new Error(`Preimage.Cleared at block ${ev.height} names ${ev.args.hash}, which the store never opened`)
            open.delete(row.hash)
            batch.preimages.set(row.id, row)
            row.status = PREIMAGE_CLEARED
            row.requestCount = 0
            row.clearedBlock = ev.height
            row.clearedAt = stampOf(ev)
        } else if (ev.name === 'Referenda.MetadataSet' || ev.name === 'Referenda.MetadataCleared' || ev.name === 'Referenda.Submitted') {
            const row = open.get(ev.name === 'Referenda.Submitted' ? ev.args.proposal?.hash : ev.args.hash)
            if (row != null) batch.preimageAt.set(ev.id, row)
        }
    }
    return open
}

function openPreimage(ev: GovEvent): Preimage {
    return new Preimage({
        id: ev.id,
        hash: ev.args.hash,
        status: 'Requested',
        len: null,
        depositor: null,
        deposit: null,
        requestCount: 0,
        bytes: null,
        notedBlock: null,
        notedAt: null,
        extrinsic: null,
        clearedBlock: null,
        clearedAt: null,
        kind: null,
        title: null,
        calls: null,
    })
}

// the block that noted a row may be the last one to hold its bytes and ticket
async function notePreimage(batch: BatchData, row: Preimage, ev: GovEvent, rpc: RpcClient): Promise<void> {
    row.notedBlock = ev.height
    row.notedAt = stampOf(ev)
    row.extrinsic = ev.extrinsic == null ? null : new Extrinsic({id: ev.extrinsic})
    const status = await requestStatus(ev.header).get(ev.header, row.hash)
    if (status != null) applyRequestStatus(batch, row, status, ev.height)
    const bytes = await fetchPreimage(rpc, row.hash, ev.height)
    if (bytes == null) return
    row.bytes = bytes
    Object.assign(row, readPreimage(bytes, ev.header._runtime))
}

function requestStatus(header: any) {
    const s = storage.preimage.requestStatusFor.v100
    if (!s.is(header)) throw new Error(`unhandled spec version for preimage status at block ${header.height}`)
    return s
}

// a request count moves without an event, so every row still open is read back
async function refreshPreimages(batch: BatchData, open: Map<string, Preimage>, lastHeader: any): Promise<void> {
    if (open.size === 0) return
    const rows = [...open.values()]
    const statuses = await requestStatus(lastHeader).getMany(lastHeader, rows.map(p => p.hash))
    rows.forEach((row, i) => {
        const status = statuses[i]
        if (status == null) throw new Error(`preimage ${row.hash} has no status at block ${lastHeader.height}`)
        if (applyRequestStatus(batch, row, status, lastHeader.height)) batch.preimages.set(row.id, row)
    })
}

function applyRequestStatus(batch: BatchData, row: Preimage, status: RequestStatus, height: number): boolean {
    const ticket = status.__kind === 'Requested' ? status.maybeTicket : status.ticket
    const len = (status.__kind === 'Requested' ? status.maybeLen : status.len) ?? null
    const count = status.__kind === 'Requested' ? status.count : 0
    const deposit = ticket?.[1] ?? null
    const changed = row.status !== status.__kind || row.len !== len || row.requestCount !== count || row.deposit !== deposit || (row.depositor?.id ?? null) !== (ticket?.[0] ?? null)
    if (!changed) return false
    row.status = status.__kind
    row.len = len
    row.requestCount = count
    row.deposit = deposit
    row.depositor = ticket == null ? null : batch.touch(ticket[0], height)
    return true
}

// postgres text cannot hold a NUL, and anybody can pay to note one
function readPreimage(bytes: Uint8Array, runtime: Runtime): Pick<Preimage, 'kind' | 'title' | 'calls'> {
    const call = decodeCall(bytes, runtime)
    if (call != null) {
        const calls: ProposalNode[] = []
        walkProposal(call, runtime, calls, [])
        return {kind: 'Call', title: null, calls}
    }
    const text = decodeUtf8('0x' + bytesToHex(bytes))
    if (text == null || text.includes('\0')) return {kind: 'Raw', title: null, calls: null}
    return {kind: 'Text', title: readMetadataText(bytes).title, calls: null}
}

// the full key ends with the encoded (hash, len) pair, prefix scanning recovers len
async function fetchPreimage(rpc: RpcClient, hash: string, height: number): Promise<Uint8Array | undefined> {
    const at = await rpc.call('chain_getBlockHash', [height])
    const keys: string[] = await rpc.call('state_getKeysPaged', [PREIMAGE_FOR_PREFIX + hash.slice(2), 1, null, at])
    if (keys == null || keys.length === 0) return undefined
    const raw: string | null = await rpc.call('state_getStorage', [keys[0], at])
    if (raw == null) return undefined
    const src = new Src(hexToBytes(raw.slice(2)))
    return src.bytes(src.compactLength())
}

// the convention is a noted preimage holding commit shaped utf8 text, the
// first line is the title and everything past the first break the description
function readMetadataText(bytes: Uint8Array): {title: string | null; description: string | null} {
    const dump = new TextDecoder().decode(bytes)
    const cut = dump.indexOf('\n')
    const title = (cut === -1 ? dump : dump.slice(0, cut)).trim()
    const description = cut === -1 ? '' : dump.slice(cut + 1).trim()
    return {title: title || null, description: description || null}
}

export function enactmentId(index: number): string {
    const idx = new Uint8Array(4)
    new DataView(idx.buffer).setUint32(0, index, true)
    // LockIdentifier is eight raw bytes, the str carries a compact length
    const parts = [Buffer.from(ASSEMBLY_ID), Buffer.from([ENACTMENT.length << 2]), Buffer.from(ENACTMENT), Buffer.from(idx)]
    const digest = blake2b.create({dkLen: 32}).update(new Uint8Array(Buffer.concat(parts))).digest()
    return '0x' + Buffer.from(digest).toString('hex')
}

type Call = {name: string; args: any}

/**
 * One call out of a proposal, kept in the order the chain would run it. The
 * address is what puts a batch back together the way Call rows do, its length
 * is the depth.
 */
export interface ProposalNode {
    pallet: string
    method: string
    address: number[]
    args: unknown
    /** Planck, held as a string because this lands in a json column. */
    amount?: string
    beneficiary?: string
    /** The block the payout window opens on, null when the call sets none. */
    validFrom?: number | null
    /** The bounty an approval names. */
    bounty?: number
}

/**
 * A proposal runs one call, and a batch is how it runs several. What the
 * treasury pays out is the sum of the spends anywhere inside it, so the walk
 * goes down rather than reading the outermost call alone.
 */
async function applyProposals(batch: BatchData, rpc: RpcClient): Promise<void> {
    for (const ev of batch.govEvents) {
        if (ev.name !== 'Referenda.Submitted') continue
        const r = batch.referenda.get(ev.args.index)
        if (r == null) continue
        r.proposalPreimage = batch.preimageAt.get(ev.id) ?? null
        // the call was encoded against the runtime of the block that took it
        const runtime: Runtime = ev.header._runtime
        const call = await proposalCall(rpc, ev.args.proposal, ev.height, runtime)
        if (call != null) await setProposal(batch, r, call, runtime)
    }
}

async function setProposal(batch: BatchData, r: Referendum, call: Call, runtime: Runtime): Promise<void> {
    const nodes: ProposalNode[] = []
    walkProposal(call, runtime, nodes, [])
    r.proposalPallet = nodes[0].pallet
    r.proposalMethod = nodes[0].method
    r.proposalCalls = nodes
    r.proposalRuntime = await proposedRuntime(batch, nodes)

    const bounty = nodes.find(node => node.bounty != null)
    if (bounty != null) r.proposalBountyIndex = bounty.bounty

    const spends = nodes.filter(node => node.amount != null)
    r.proposalPayouts = spends.length
    if (spends.length === 0) return
    r.proposalAmount = spends.reduce((sum, spend) => sum + BigInt(spend.amount!), 0n)
    const payees = new Set(spends.map(spend => spend.beneficiary))
    if (payees.size === 1) r.proposalBeneficiary = spends[0].beneficiary
}

// a preimage noted after the submit is read at the block before the dispatch
async function recordEnactedCalls(batch: BatchData, rpc: RpcClient): Promise<void> {
    for (const {index, height, header, success} of batch.enacted) {
        const r = batch.referenda.get(index)
        if (r == null) continue
        if (r.proposalCalls == null) {
            const call = await proposalCall(rpc, {__kind: 'Lookup', hash: r.proposalHash}, height - 1, header._runtime)
            if (call != null) await setProposal(batch, r, call, header._runtime)
        }
        for (const node of (r.proposalCalls as ProposalNode[] | null) ?? []) addEnactedCall(batch, r, header, node, success)
    }
}

function addEnactedCall(batch: BatchData, r: Referendum, header: any, node: ProposalNode, success: boolean): void {
    const id = (address: number[]) => [`referendum-${r.index}`, ...address.map(i => String(i).padStart(6, '0'))].join('-')
    batch.enactedCalls.push(
        new CallRow({
            id: id(node.address),
            block: new Block({id: header.id}),
            referendum: new Referendum({id: r.id}),
            address: node.address,
            parent: node.address.length === 0 ? undefined : new CallRow({id: id(node.address.slice(0, -1))}),
            pallet: node.pallet,
            method: node.method,
            args: node.args,
            success,
        })
    )
    const kind = `${node.pallet}.${node.method}`
    if (!batch.callKinds.has(kind)) batch.callKinds.set(kind, new CallKind({id: kind, pallet: node.pallet, method: node.method}))
}

// an inline proposal carries its bytes, a lookup leaves them in the preimage
// store where anybody may unnote them once the referendum is over
const CODE_CALLS = new Set(['Prime.upgrade', 'System.set_code', 'System.set_code_without_checks'])

async function proposedRuntime(batch: BatchData, nodes: ProposalNode[]): Promise<RuntimeCode | null> {
    const node = nodes.find(n => CODE_CALLS.has(`${n.pallet}.${n.method}`))
    if (node == null) return null
    const wasm = (node.args as {code: string}).code
    const id = '0x' + bytesToHex(blake2b(hexToBytes(wasm.slice(2)), {dkLen: 32}))
    const known = batch.runtimeCodes.get(id)
    if (known != null) return known
    const found = await readRuntime(wasm)
    const code = new RuntimeCode({
        id,
        specName: found?.specName ?? null,
        specVersion: found?.specVersion ?? null,
        implVersion: found?.implVersion ?? null,
        transactionVersion: found?.transactionVersion ?? null,
        metadata: found && hexToBytes(found.metadata.slice(2)),
    })
    batch.runtimeCodes.set(id, code)
    return code
}

async function proposalCall(rpc: RpcClient, proposal: any, height: number, runtime: Runtime): Promise<Call | undefined> {
    if (proposal?.__kind === 'Inline') return decodeCall(proposal.value, runtime)
    if (proposal?.__kind !== 'Lookup') return undefined
    const bytes = await fetchPreimage(rpc, proposal.hash, height)
    if (bytes == null) return undefined
    return decodeCall(bytes, runtime)
}

function walkProposal(call: Call, runtime: Runtime, nodes: ProposalNode[], address: number[]): void {
    const [pallet, method] = call.name.split('.')
    nodes.push(Object.assign({pallet, method, address, args: toJSON(call.args)}, readSpend(call), readBounty(call)))

    if (!BATCH_CALLS.has(call.name) || address.length >= MAX_PROPOSAL_DEPTH) return
    for (const [i, inner] of (call.args.calls ?? []).entries()) {
        const record = decodeInner(inner, runtime)
        if (record != null) walkProposal(record, runtime, nodes, [...address, i])
    }
}

// spend_local wraps the beneficiary in a MultiAddress while spend hands the
// account over bare, and only spend can hold a payout back
function readSpend(call: Call): Partial<ProposalNode> | undefined {
    if (call.name === 'Treasury.spend_local' && call.args.beneficiary?.__kind === 'Id') {
        return {amount: String(call.args.amount), beneficiary: call.args.beneficiary.value, validFrom: null}
    }
    if (call.name === 'Treasury.spend' && typeof call.args.beneficiary === 'string') {
        return {amount: String(call.args.amount), beneficiary: call.args.beneficiary, validFrom: call.args.validFrom ?? null}
    }
    return undefined
}

// approve_bounty and its with_curator shortcut both name the bounty
function readBounty(call: Call): Partial<ProposalNode> | undefined {
    if (call.name !== 'Bounties.approve_bounty' && call.name !== 'Bounties.approve_bounty_with_curator') {
        return undefined
    }
    return {bounty: Number(call.args.bountyId)}
}

function decodeInner(call: any, runtime: Runtime): Call | undefined {
    try {
        return runtime.toCallRecord(call)
    } catch {
        return undefined
    }
}

/**
 * A preimage holds whatever bytes somebody paid to store, so anything that
 * does not read back as a call of this runtime is simply not one.
 */
function decodeCall(callBytes: string | Uint8Array, runtime: Runtime): Call | undefined {
    try {
        return runtime.toCallRecord(runtime.decodeCall(callBytes))
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
    const deposits: ReferendumDeposit[] = await ctx.store.find(ReferendumDeposit, {
        where: {referendum: {index: In([...indices])}},
        relations: {referendum: true},
    })
    for (const d of deposits) batch.deposits.set(d.id, d)
}

// the scheduler ends a task with one of these, the named ones carry the task id
const ENACTMENT_ENDS = new Set(['Scheduler.Dispatched', 'Scheduler.CallUnavailable', 'Scheduler.PermanentlyOverweight'])

// only approved referenda can own a named task
async function loadEnactments(ctx: {store: any}, batch: BatchData): Promise<void> {
    const named = batch.govEvents.filter(e => ENACTMENT_ENDS.has(e.name) && e.args.id != null)
    if (named.length === 0) return
    const ids = new Set(named.map(e => e.args.id))
    const rows: Referendum[] = await ctx.store.find(Referendum, {where: {status: ReferendumStatus.Approved}, relations: {track: true}})
    for (const r of rows) {
        const id = enactmentId(r.index)
        if (!ids.has(id)) continue
        batch.enactments.set(id, r.index)
        if (!batch.referenda.has(r.index)) batch.referenda.set(r.index, r)
    }
}

function applyGovEvent(batch: BatchData, ev: GovEvent): void {
    const [pallet, method] = ev.name.split('.')
    if (pallet === 'Referenda') applyReferendaEvent(batch, method, ev)
    else if (pallet === 'ConvictionVoting') applyVoteEvent(batch, method, ev)
    else if (pallet === 'Treasury') applyTreasuryEvent(batch, method, ev)
    else if (ev.name === 'Scheduler.Dispatched') applyDispatch(batch, ev)
    else if (ENACTMENT_ENDS.has(ev.name)) applyUndispatched(batch, ev)
}

function pushTimeline(r: Referendum, ev: GovEvent, extra: object = {}): any {
    const step = {event: ev.id, name: ev.name, block: ev.height, timestamp: stampOf(ev).toISOString(), ...extra}
    r.timeline = [...((r.timeline as any[]) ?? []), step]
    return step
}

function setTally(r: Referendum, tally: any): void {
    if (tally == null) return
    r.ayes = BigInt(tally.ayes)
    r.nays = BigInt(tally.nays)
    r.support = BigInt(tally.support)
}

function applyReferendaEvent(batch: BatchData, method: string, ev: GovEvent): void {
    const args = ev.args
    if (method === 'Submitted') {
        const r = new Referendum({
            id: String(args.index),
            index: args.index,
            track: new Track({id: String(args.track)}),
            origin: toJSON(ev.callArgs?.proposalOrigin),
            proposalHash: proposalHash(args.proposal),
            submitter: ev.origin ? batch.touch(ev.origin, ev.height) : undefined,
            submittedAt: ev.height,
            submittedTimestamp: stampOf(ev),
            status: ReferendumStatus.Ongoing,
            inQueue: false,
            ayes: 0n,
            nays: 0n,
            support: 0n,
            timeline: [],
        })
        pushTimeline(r, ev)
        batch.referenda.set(r.index, r)
        placeDeposit(batch, r, ReferendumDepositKind.Submission, ev.origin, submissionDeposit(ev.header), ev.height)
        return
    }
    const kill = `${ev.height}-${ev.extrinsic ?? ''}`
    if (method === 'Killed') batch.kills.set(kill, args.index)
    const r = batch.referenda.get(method === 'DepositSlashed' ? batch.kills.get(kill) : args.index)
    if (r == null) return
    // the text log keeps the metadata events, the rail is for the lifecycle
    const step = method.startsWith('Metadata') ? null : pushTimeline(r, ev)
    if ((method === 'Cancelled' || method === 'Killed') && ev.origin == null) batch.revocations.push({height: ev.height, step})
    switch (method) {
        case 'DecisionStarted':
            r.decidingSince = ev.height
            setTally(r, args.tally)
            break
        case 'ConfirmStarted':
            r.confirmingSince = ev.height
            break
        case 'ConfirmAborted':
            r.confirmingSince = null
            break
        case 'DecisionDepositPlaced':
            placeDeposit(batch, r, ReferendumDepositKind.Decision, args.who, BigInt(args.amount), ev.height)
            break
        case 'SubmissionDepositRefunded':
            endDeposit(batch, r, ReferendumDepositKind.Submission, ReferendumDepositState.Refunded, ev.height)
            break
        case 'DecisionDepositRefunded':
            endDeposit(batch, r, ReferendumDepositKind.Decision, ReferendumDepositState.Refunded, ev.height)
            break
        // the pallet schedules the enactment as it confirms
        case 'Confirmed':
            batch.enactments.set(enactmentId(args.index), args.index)
            setTally(r, args.tally)
            break
        // a kill slashes whatever the referendum still holds
        case 'Killed':
            for (const kind of [ReferendumDepositKind.Submission, ReferendumDepositKind.Decision]) endDeposit(batch, r, kind, ReferendumDepositState.Slashed, ev.height)
            setTally(r, args.tally)
            break
        case 'Rejected':
        case 'TimedOut':
        case 'Cancelled':
            setTally(r, args.tally)
            break
    }
}

// a submit the scheduler dispatches leaves no call to read, so the requested
// moment comes from the Ongoing info, and the block follows
// pallet_referenda::schedule_enactment
async function scheduleEnactments(batch: BatchData): Promise<void> {
    const info = storage.referenda.referendumInfoFor.v100
    for (const ev of batch.govEvents) {
        if (ev.name === 'Referenda.Submitted') {
            if (!info.is(ev.header)) throw new Error('unhandled spec version for referendum info')
            const at = await info.get(ev.header, ev.args.index)
            if (at?.__kind !== 'Ongoing') throw new Error(`referendum ${ev.args.index} is not ongoing at its submission block ${ev.height}`)
            batch.referenda.get(ev.args.index)!.enactment = toJSON(at.value.enactment)
        } else if (ev.name === 'Referenda.Confirmed') {
            const r = batch.referenda.get(ev.args.index)!
            const moment = r.enactment as DispatchTime
            const desired = moment.__kind === 'At' ? moment.value : ev.height + moment.value
            r.enactsAt = Math.max(desired, ev.height + Math.max(minEnactmentPeriod(ev.header, Number(r.track.id)), 1))
        }
    }
}

function minEnactmentPeriod(header: any, track: number): number {
    const c = constants.referenda.tracks.v100
    if (!c.is(header)) throw new Error(`unhandled spec version for tracks at block ${header.height}`)
    const t = c.get(header).find(([id]) => id === track)
    if (t == null) throw new Error(`track ${track} missing at block ${header.height}`)
    return t[1].minEnactmentPeriod
}

const depositId = (r: Referendum, kind: ReferendumDepositKind) => `${r.index}-${kind.toLowerCase()}`

function submissionDeposit(header: any): bigint {
    const c = constants.referenda.submissionDeposit.v100
    if (!c.is(header)) throw new Error(`unhandled spec version for submission deposit at block ${header.height}`)
    return c.get(header)
}

function placeDeposit(batch: BatchData, r: Referendum, kind: ReferendumDepositKind, who: string | undefined, amount: bigint, height: number): void {
    const id = depositId(r, kind)
    batch.deposits.set(
        id,
        new ReferendumDeposit({id, referendum: r, kind, who: who ? batch.touch(who, height) : null, amount, placedAt: height, state: ReferendumDepositState.Held, endedAt: null})
    )
}

function endDeposit(batch: BatchData, r: Referendum, kind: ReferendumDepositKind, state: ReferendumDepositState, height: number): void {
    const d = batch.deposits.get(depositId(r, kind))
    if (d == null || d.state !== ReferendumDepositState.Held) return
    d.state = state
    d.endedAt = height
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
            ...decoded,
            block: ev.height,
            removed: method === 'VoteRemoved',
        })
    )
}

interface PollEnd {
    height: number
    status: string
}

interface VoteLocks {
    // the referenda that end in this batch, filled in as their end events go by
    ends: Map<number, PollEnd>
    // stored votes still standing on a referendum that ends in this batch
    standing: Map<string, Vote>
    // stored votes not yet freed, of the accounts that unlock in this batch
    held: Map<string, Vote>
    // the polls each unlock left on the account's voting record for its track,
    // null where the lock it set no longer matches that record
    kept: Map<string, Set<number> | null>
}

const END_STATUS: Record<string, string> = {Confirmed: 'Approved', Rejected: 'Rejected', TimedOut: 'TimedOut', Cancelled: 'Cancelled', Killed: 'Killed'}

async function loadVoteLocks(ctx: {store: any}, batch: BatchData): Promise<VoteLocks> {
    const ending = batch.govEvents.filter(e => e.name.startsWith('Referenda.') && END_STATUS[e.name.slice(10)] != null).map(e => String(e.args.index))
    const unlocks = batch.govEvents.filter(e => e.name === 'ConvictionVoting.VoteUnlocked')
    const unlocking = [...new Set(unlocks.map(e => e.args.who))]
    const [standing, held]: Vote[][] = await Promise.all([
        ending.length > 0 ? ctx.store.find(Vote, {where: {referendum: {id: In(ending)}, removed: false}, relations: {referendum: {track: true}, voter: true}}) : [],
        unlocking.length > 0 ? ctx.store.find(Vote, {where: {voter: {id: In(unlocking)}, unlockedAt: IsNull()}, relations: {referendum: {track: true}, voter: true}}) : [],
    ])
    const kept = new Map(await Promise.all(unlocks.map(async e => [e.id, await castPolls(e)] as const)))
    return {ends: new Map(), standing: new Map(standing.map(v => [v.id, v])), held: new Map(held.map(v => [v.id, v])), kept}
}

// remove_vote raises no event once the referendum is over, so what an unlock
// frees is read off the voting record the block left behind. only the unlock
// rewrites the track's lock, and a remove_vote later in the block leaves it
// above what the record still asks for, those votes wait for the next unlock
async function castPolls(ev: GovEvent): Promise<Set<number> | null> {
    const voting = storage.convictionVoting.votingFor.v100
    const classLocks = storage.convictionVoting.classLocksFor.v100
    if (!voting.is(ev.header) || !classLocks.is(ev.header)) throw new Error(`unhandled spec version for voting at block ${ev.height}`)
    const [record, locks] = await Promise.all([voting.get(ev.header, ev.args.who, ev.args.class), classLocks.get(ev.header, ev.args.who)])
    const locked = locks?.find(([track]) => track === ev.args.class)?.[1] ?? 0n
    const prior = record == null || ev.height >= record.value.prior[0] ? 0n : record.value.prior[1]
    const votes = record?.__kind === 'Casting' ? record.value.votes : []
    const held = record?.__kind === 'Delegating' ? record.value.balance : 0n
    const asks = votes.reduce((m, [, v]) => (voteBalance(v) > m ? voteBalance(v) : m), prior > held ? prior : held)
    return locked === asks ? new Set(votes.map(([poll]) => poll)) : null
}

// what a vote holds on the voter's balance, the whole of a split counts
function voteBalance(v: AccountVote): bigint {
    switch (v.__kind) {
        case 'Standard':
            return v.balance
        case 'Split':
            return v.aye + v.nay
        case 'SplitAbstain':
            return v.aye + v.nay + v.abstain
    }
}

// conviction is only charged to the side that won, a cancelled, timed out or
// killed referendum charges nobody
function lockEnd(v: AccountVoteFields, end: PollEnd, header: any): number {
    const won = v.kind === 'Standard' && ((end.status === 'Approved' && v.aye === true) || (end.status === 'Rejected' && v.aye === false))
    if (!won) return end.height
    const period = constants.convictionVoting.voteLockingPeriod.v100
    if (!period.is(header)) throw new Error(`unhandled spec version for the vote locking period at block ${header.height}`)
    const level = v.conviction === 'None' ? 0 : Number(v.conviction!.slice(6, -1))
    return end.height + period.get(header) * lockPeriods(level)
}

const pollOf = (v: Vote) => Number(v.referendum.id)

// the vote locks follow the events in order, a vote taken off before its
// referendum ends frees its balance there and then, one taken off after keeps
// the lock its result charged, and an unlock frees each vote that has run out
// and is gone from the account's voting record
function stampVoteLock(batch: BatchData, locks: VoteLocks, ev: GovEvent): void {
    const [pallet, method] = ev.name.split('.')
    if (pallet === 'Referenda' && END_STATUS[method] != null) {
        const end = {height: ev.height, status: END_STATUS[method]}
        locks.ends.set(ev.args.index, end)
        const votes = new Map(locks.standing)
        for (const v of batch.votes.values()) votes.set(v.id, v)
        for (const v of votes.values()) {
            if (pollOf(v) !== ev.args.index || v.removed) continue
            v.lockedUntil = lockEnd(voteFields(v), end, ev.header)
            batch.votes.set(v.id, v)
        }
        return
    }
    if (pallet !== 'ConvictionVoting') return
    if (method === 'Voted' || method === 'VoteRemoved') {
        const v = batch.votes.get(`${ev.args.pollIndex}-${ev.args.who}`)
        if (v == null) return
        const r = batch.referenda.get(ev.args.pollIndex)
        const end = locks.ends.get(ev.args.pollIndex) ?? (r != null && r.status !== ReferendumStatus.Ongoing ? {height: r.endedAt!, status: r.status} : undefined)
        v.lockedUntil = method === 'Voted' ? null : end ? lockEnd(voteFields(v), end, ev.header) : ev.height
        v.unlockedAt = null
        return
    }
    if (method === 'VoteUnlocked') {
        const track = String(ev.args.class)
        const kept = locks.kept.get(ev.id)
        if (kept == null) return
        const votes = new Map([...locks.held].filter(([, v]) => v.voter.id === ev.args.who))
        for (const v of batch.votes.values()) if (v.voter.id === ev.args.who) votes.set(v.id, v)
        for (const v of votes.values()) {
            const trackOf = batch.referenda.get(pollOf(v))?.track.id ?? v.referendum.track.id
            if (v.unlockedAt != null || v.lockedUntil == null || v.lockedUntil > ev.height || trackOf !== track || kept.has(pollOf(v))) continue
            v.unlockedAt = ev.height
            batch.votes.set(v.id, v)
        }
    }
}

interface AccountVoteFields {
    kind: string
    aye: boolean | null
    conviction: string | null
    balance: bigint | null
    ayeAmount: bigint | null
    nayAmount: bigint | null
    abstainAmount: bigint | null
    votes: bigint
}

const voteFields = (v: Vote): AccountVoteFields => ({
    kind: v.kind,
    aye: v.aye ?? null,
    conviction: v.conviction ?? null,
    balance: v.balance ?? null,
    ayeAmount: v.ayeAmount ?? null,
    nayAmount: v.nayAmount ?? null,
    abstainAmount: v.abstainAmount ?? null,
    votes: v.votes,
})

// a standard vote packs the aye bit and the conviction index into one byte,
// the index counts None then Locked1x up to Locked6x. a voter's row is reused
// across recasts, so the parts the new shape lacks are cleared outright
function decodeAccountVote(vote: any): AccountVoteFields | undefined {
    const fields = decodeVoteParts(vote)
    return fields && {...fields, votes: ownVotes(fields)}
}

function decodeVoteParts(vote: any): Omit<AccountVoteFields, 'votes'> | undefined {
    const blank = {aye: null, conviction: null, balance: null, ayeAmount: null, nayAmount: null, abstainAmount: null}
    if (vote?.__kind === 'Standard') {
        const v = Number(vote.vote)
        const level = v & 0x7f
        return {...blank, kind: 'Standard', aye: (v & 0x80) !== 0, conviction: level === 0 ? 'None' : `Locked${level}x`, balance: BigInt(vote.balance)}
    }
    if (vote?.__kind === 'Split') {
        return {...blank, kind: 'Split', ayeAmount: BigInt(vote.aye), nayAmount: BigInt(vote.nay)}
    }
    if (vote?.__kind === 'SplitAbstain') {
        return {...blank, kind: 'SplitAbstain', ayeAmount: BigInt(vote.aye), nayAmount: BigInt(vote.nay), abstainAmount: BigInt(vote.abstain)}
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
    for (const v of batch.revocations) if (v.height === ev.height) v.step.byReferendum = index
    batch.revocations = batch.revocations.filter(v => v.height !== ev.height)
    const r = batch.referenda.get(index)
    const result = ev.args.result
    if (r != null) pushTimeline(r, ev, {error: result.__kind === 'Err' ? dispatchErrorName(result.value, ev.header._runtime) : null})
    const spends = pending.map(spendId => batch.spends.get(spendId)).filter(s => s != null)
    for (const s of spends) s.referendum = new Referendum({id: String(index)})
    batch.enacted.push({index, height: ev.height, header: ev.header, success: result.__kind === 'Ok', spends})
}

// the call never ran, the event name says why
function applyUndispatched(batch: BatchData, ev: GovEvent): void {
    const index = typeof ev.args?.id === 'string' ? batch.enactments.get(ev.args.id) : undefined
    const r = index != null ? batch.referenda.get(index) : undefined
    if (r != null) pushTimeline(r, ev)
}

// spends land in the order their calls ran, and a batch that skips a failed
// call leaves a gap, so each spend takes the next call it could have come from
function matchEnactedSpends(batch: BatchData): void {
    for (const {index, height, spends} of batch.enacted) {
        const nodes = batch.referenda.get(index)?.proposalCalls as ProposalNode[] | null | undefined
        if (nodes != null) matchSpendCalls(spends, nodes, height)
    }
}

export function matchSpendCalls(spends: TreasurySpend[], nodes: ProposalNode[], height: number): void {
    let next = 0
    for (const s of spends) {
        const at = nodes.findIndex((node, i) => i >= next && fromCall(s, node, height))
        if (at < 0) throw new Error(`spend ${s.id} matches no call of its referendum`)
        s.proposalCall = at
        next = at + 1
    }
}

// a spend without valid_from opens at the block that dispatched it
function fromCall(s: TreasurySpend, node: ProposalNode, height: number): boolean {
    if (`${node.pallet}.${node.method}` !== `Treasury.${s.kind}`) return false
    if (node.beneficiary !== s.beneficiary.id || node.amount !== String(s.amount)) return false
    return s.kind !== 'spend' || (node.validFrom ?? height) === s.validFrom
}

// a module error is a pallet index and an index into that pallet's error enum,
// the metadata of the runtime the block ran names both
function dispatchErrorName(err: any, runtime: Runtime): string {
    if (err.__kind !== 'Module') return err.value?.__kind == null ? err.__kind : `${err.__kind}.${err.value.__kind}`
    const meta = runtime.metadata
    if (meta.__kind !== 'V14') throw new Error(`unhandled metadata ${meta.__kind}`)
    const pallet = meta.value.pallets.find(p => p.index === err.value.index)
    const def = meta.value.lookup.types.find(t => t.id === pallet?.errors?.type)?.type.def
    const variant = def?.__kind === 'Variant' ? def.value.variants.find(v => v.index === parseInt(err.value.error.slice(2, 4), 16)) : undefined
    if (pallet == null || variant == null) throw new Error(`no module error ${err.value.error} in pallet ${err.value.index}`)
    return `${pallet.name}.${variant.name}`
}

// a spend_local is keyed by proposal index and a spend by its own index, the
// id keeps the two apart
function spendId(method: string, args: any): string | undefined {
    switch (method) {
        case 'SpendApproved':
        case 'Awarded':
            return `local-${args.proposalIndex}`
        case 'AssetSpendApproved':
        case 'Paid':
        case 'AssetSpendVoided':
        case 'PaymentFailed':
        case 'SpendProcessed':
            return `spend-${args.index}`
    }
    return undefined
}

async function loadTouchedSpends(ctx: {store: any}, batch: BatchData): Promise<void> {
    const ids = new Set<string>()
    for (const ev of batch.govEvents) {
        const [pallet, method] = ev.name.split('.')
        if (pallet !== 'Treasury') continue
        const id = spendId(method, ev.args)
        if (id != null) ids.add(id)
    }
    if (ids.size === 0) return
    const rows: TreasurySpend[] = await ctx.store.find(TreasurySpend, {where: {id: In([...ids])}, relations: {beneficiary: true}})
    for (const s of rows) batch.spends.set(s.id, s)
}

// the call family each approval event comes from, the runtime pays both to an
// account
const APPROVED_KIND = new Map([
    ['SpendApproved', 'spend_local'],
    ['AssetSpendApproved', 'spend'],
])

function applyTreasuryEvent(batch: BatchData, method: string, ev: GovEvent): void {
    const args = ev.args
    const id = spendId(method, args)
    if (id == null) return
    const kind = APPROVED_KIND.get(method)
    if (kind == null) {
        const s = batch.spends.get(id)
        if (s == null) throw new Error(`Treasury.${method} names spend ${id}, which was never approved`)
        s.status = method
        if (method === 'Paid') s.paidAt = ev.height
        if (method === 'Paid' || method === 'Awarded') batch.payouts.push(spendPayout(s, method === 'Awarded' ? BigInt(args.award) : s.amount, ev))
        return
    }
    batch.spendsAtHeight.set(ev.height, [...(batch.spendsAtHeight.get(ev.height) ?? []), id])
    batch.spends.set(
        id,
        new TreasurySpend({
            id,
            kind,
            beneficiary: batch.touch(args.beneficiary, ev.height),
            amount: BigInt(args.amount),
            status: method,
            block: ev.height,
            indexInBlock: ev.indexInBlock,
            validFrom: args.validFrom ?? null,
            expireAt: args.expireAt ?? null,
            paidAt: null,
            proposalCall: null,
        })
    )
}

function spendPayout(s: TreasurySpend, amount: bigint, ev: GovEvent): TreasuryPayout {
    return new TreasuryPayout({
        id: ev.id,
        account: s.beneficiary,
        source: TreasuryPayoutSource.Spend,
        role: TreasuryPayoutRole.Beneficiary,
        spend: s,
        amount,
        block: ev.height,
    })
}

// status is the ReferendumInfoFor variant, an ended one stores the block it
// ended at but no tally, the end event carried the final one
async function refreshOngoing(ctx: {store: any}, batch: BatchData, lastHeader: any): Promise<void> {
    const open: Referendum[] = await ctx.store.find(Referendum, {
        where: {status: ReferendumStatus.Ongoing},
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
        if (info == null) throw new Error(`referendum ${idx} has no info at block ${lastHeader.height}`)
        if (info.__kind === 'Ongoing') {
            setTally(r, info.value.tally)
            r.inQueue = info.value.inQueue
        } else {
            r.status = ReferendumStatus[info.__kind]
            r.inQueue = null
            r.endedAt = info.__kind === 'Killed' ? info.value : info.value[0]
        }
        batch.referenda.set(idx, r)
    })
}
