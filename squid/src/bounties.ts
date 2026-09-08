import {In} from 'typeorm'
import {Store} from '@subsquid/typeorm-store'
import {Account, Bounty, ChildBounty, Referendum} from './model'
import {BatchData} from './batch'
import {storage} from './types'
import {decodeUtf8} from './utf8'

// events drive the lifecycle and the timeline, then chain storage at the batch
// head fills value, fee, description and curator or beneficiary detail for
// everything still alive, claimed and cancelled rows keep their event data

export interface BountyEvent {
    id: string
    name: string
    args: any
    height: number
    at: Date
    signer?: string
}

// the chain drops the entry once a bounty ends, the event that dropped it is
// the status from then on
const TERMINAL = new Set(['BountyClaimed', 'BountyRejected', 'BountyCanceled'])
const CHILD_TERMINAL = new Set(['Claimed', 'Canceled'])

export function collectBountyEvent(batch: BatchData, id: string, name: string, args: any, height: number, at: Date, signer?: string): void {
    const pallet = name.split('.')[0]
    if (pallet !== 'Bounties' && pallet !== 'ChildBounties') return
    for (const key of ['curator', 'beneficiary']) {
        if (typeof args?.[key] === 'string') batch.touch(args[key], height)
    }
    batch.bountyEvents.push({id, name, args, height, at, signer})
}

// child bounty curator management emits no events at all
export function collectBountyCall(batch: BatchData, name: string, args: any, height: number): void {
    if (name !== 'ChildBounties.propose_curator' && name !== 'ChildBounties.accept_curator' && name !== 'ChildBounties.unassign_curator') return
    const curator = args.curator?.value ?? args.curator
    if (typeof curator === 'string') batch.touch(curator, height)
    batch.childRefresh.add(`${args.parentBountyId}-${args.childBountyId}`)
}

export async function finalizeBounties(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    if (batch.bountyEvents.length === 0 && batch.childRefresh.size === 0) return
    await loadTouched(batch, store)
    for (const ev of batch.bountyEvents) applyBountyEvent(batch, ev)
    await refreshFromStorage(batch, lastHeader)
    await linkReferenda(batch, store)
}

// the bounty is proposed first and the referendum names it later, so the
// pointer is written from whichever side arrives second
async function linkReferenda(batch: BatchData, store: Store): Promise<void> {
    const byBounty = new Map<number, Referendum>()
    for (const r of batch.referenda.values()) if (r.proposalBountyIndex != null) byBounty.set(r.proposalBountyIndex, r)
    for (const b of batch.bounties.values()) {
        const r = byBounty.get(b.index)
        if (r != null) b.referendum = r
    }
    const missing = [...byBounty.keys()].filter(i => !batch.bounties.has(String(i)))
    if (missing.length === 0) return
    const rows: Bounty[] = await store.find(Bounty, {where: {index: In(missing)}})
    for (const b of rows) {
        b.referendum = byBounty.get(b.index)
        batch.bounties.set(String(b.index), b)
    }
}

async function loadTouched(batch: BatchData, store: Store): Promise<void> {
    const parents = new Set<number>()
    const children = new Set<string>()
    for (const ev of batch.bountyEvents) {
        const idx = parentIndex(ev)
        if (ev.name.startsWith('ChildBounties.')) children.add(`${idx}-${ev.args.childIndex}`)
        else parents.add(idx)
    }
    for (const id of batch.childRefresh) children.add(id)
    if (parents.size > 0) {
        const rows = await store.find(Bounty, {where: {index: In([...parents])}})
        for (const b of rows) batch.bounties.set(b.id, b)
    }
    if (children.size > 0) {
        const rows = await store.find(ChildBounty, {
            where: {id: In([...children])},
            relations: {parent: true},
        })
        for (const c of rows) batch.childBounties.set(c.id, c)
    }
}

function parentIndex(ev: BountyEvent): number {
    return ev.args.index ?? ev.args.bountyId
}

function pushTimeline(b: Bounty, ev: BountyEvent): void {
    b.timeline = [...((b.timeline as any[]) ?? []), {event: ev.id, name: ev.name, block: ev.height, timestamp: ev.at.toISOString()}]
}

// the events only say which BountyStatus variant the chain moved to, storage
// at the batch head fills the rest in for whatever is still alive
function applyBountyEvent(batch: BatchData, ev: BountyEvent): void {
    if (ev.name.startsWith('ChildBounties.')) return applyChildEvent(batch, ev)
    const args = ev.args
    const id = String(parentIndex(ev))
    const method = ev.name.split('.')[1]
    if (method === 'BountyProposed') {
        const b = new Bounty({
            id,
            index: args.index,
            proposer: ev.signer != null ? batch.touch(ev.signer, ev.height) : undefined,
            value: 0n,
            status: 'Proposed',
            createdAt: ev.height,
            updatedAt: ev.height,
            timeline: [],
        })
        pushTimeline(b, ev)
        batch.bounties.set(id, b)
        return
    }
    const b = batch.bounties.get(id)
    if (b == null) return
    b.updatedAt = ev.height
    pushTimeline(b, ev)
    switch (method) {
        case 'BountyApproved':
            b.status = 'Approved'
            break
        case 'BountyBecameActive':
            b.status = 'Funded'
            break
        case 'CuratorProposed':
            b.status = 'CuratorProposed'
            b.curator = new Account({id: args.curator})
            break
        case 'CuratorAccepted':
            b.status = 'Active'
            b.curator = new Account({id: args.curator})
            break
        case 'CuratorUnassigned':
            b.status = 'Funded'
            b.curator = null
            break
        case 'BountyAwarded':
            b.status = 'PendingPayout'
            b.beneficiary = new Account({id: args.beneficiary})
            break
        case 'BountyClaimed':
            b.status = method
            b.payout = BigInt(args.payout)
            b.beneficiary = new Account({id: args.beneficiary})
            break
        case 'BountyRejected':
        case 'BountyCanceled':
            b.status = method
            break
    }
    // the chain drops the entry once the bounty ends and both deposits go home
    if (TERMINAL.has(b.status)) {
        b.bond = null
        b.curatorDeposit = null
    }
}

function applyChildEvent(batch: BatchData, ev: BountyEvent): void {
    const args = ev.args
    const id = `${args.index}-${args.childIndex}`
    if (ev.name === 'ChildBounties.Added') {
        batch.childBounties.set(
            id,
            new ChildBounty({
                id,
                parent: new Bounty({id: String(args.index)}),
                childIndex: args.childIndex,
                value: 0n,
                status: 'Added',
                createdAt: ev.height,
                updatedAt: ev.height,
            })
        )
        return
    }
    const c = batch.childBounties.get(id)
    if (c == null) return
    c.updatedAt = ev.height
    switch (ev.name) {
        case 'ChildBounties.Awarded':
            c.status = 'PendingPayout'
            c.beneficiary = new Account({id: args.beneficiary})
            break
        case 'ChildBounties.Claimed':
            c.status = 'Claimed'
            c.payout = BigInt(args.payout)
            c.beneficiary = new Account({id: args.beneficiary})
            break
        case 'ChildBounties.Canceled':
            c.status = 'Canceled'
            break
    }
    if (CHILD_TERMINAL.has(c.status)) c.curatorDeposit = null
}

async function refreshFromStorage(batch: BatchData, lastHeader: any): Promise<void> {
    const bounties = [...batch.bounties.values()].filter(b => !TERMINAL.has(b.status))
    if (bounties.length > 0) {
        const s = storage.bounties.bounties.v100
        const d = storage.bounties.bountyDescriptions.v100
        if (!s.is(lastHeader) || !d.is(lastHeader)) throw new Error('unhandled spec version for bounties')
        const indices = bounties.map(b => b.index)
        const [infos, descrs] = await Promise.all([s.getMany(lastHeader, indices), d.getMany(lastHeader, indices)])
        bounties.forEach((b, i) => {
            const info = infos[i]
            if (info == null) return
            b.proposer = new Account({id: info.proposer})
            b.value = info.value
            b.fee = info.fee
            b.bond = info.bond
            b.curatorDeposit = info.curatorDeposit
            b.description = decodeUtf8(descrs[i]) ?? b.description
            const st = info.status
            b.status = st.__kind
            b.curator = 'curator' in st ? new Account({id: st.curator}) : null
            b.beneficiary = st.__kind === 'PendingPayout' ? new Account({id: st.beneficiary}) : b.beneficiary
            b.updateDue = st.__kind === 'Active' ? st.updateDue : null
            b.unlockAt = st.__kind === 'PendingPayout' ? st.unlockAt : null
        })
    }
    const children = [...batch.childBounties.values()].filter(c => !CHILD_TERMINAL.has(c.status))
    if (children.length > 0) {
        const s = storage.childBounties.childBounties.v100
        const d = storage.childBounties.childBountyDescriptionsV1.v100
        if (!s.is(lastHeader) || !d.is(lastHeader)) throw new Error('unhandled spec version for child bounties')
        const pairs: [number, number][] = children.map(c => [Number(c.parent.id), c.childIndex])
        const [infos, descrs] = await Promise.all([s.getMany(lastHeader, pairs), d.getMany(lastHeader, pairs)])
        children.forEach((c, i) => {
            const info = infos[i]
            if (info == null) return
            c.value = info.value
            c.fee = info.fee
            c.curatorDeposit = info.curatorDeposit
            c.description = decodeUtf8(descrs[i]) ?? c.description
            const st = info.status
            c.status = st.__kind
            c.curator = 'curator' in st ? new Account({id: st.curator}) : null
            c.beneficiary = st.__kind === 'PendingPayout' ? new Account({id: st.beneficiary}) : c.beneficiary
        })
    }
}
