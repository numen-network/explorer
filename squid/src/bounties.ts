import {In} from 'typeorm'
import {Store} from '@subsquid/typeorm-store'
import {Account, Bounty, ChildBounty, Referendum} from './model'
import {BatchData} from './batch'
import {storage} from './types'

// events drive the lifecycle and the timeline, then chain storage at the batch
// head fills value, fee, description and curator or beneficiary detail for
// everything still alive, claimed and cancelled rows keep their event data

export interface BountyEvent {
    name: string
    args: any
    height: number
    signer?: string
}

const TERMINAL = new Set(['claimed', 'rejected', 'cancelled'])

export function collectBountyEvent(batch: BatchData, name: string, args: any, height: number, signer?: string): void {
    const pallet = name.split('.')[0]
    if (pallet !== 'Bounties' && pallet !== 'ChildBounties') return
    for (const key of ['curator', 'beneficiary']) {
        if (typeof args?.[key] === 'string') batch.touch(args[key], height)
    }
    batch.bountyEvents.push({name, args, height, signer})
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

function pushTimeline(b: Bounty, status: string, height: number): void {
    b.timeline = [...((b.timeline as any[]) ?? []), {status, block: height}]
}

function applyBountyEvent(batch: BatchData, ev: BountyEvent): void {
    if (ev.name.startsWith('ChildBounties.')) return applyChildEvent(batch, ev)
    const args = ev.args
    const id = String(parentIndex(ev))
    if (ev.name === 'Bounties.BountyProposed') {
        const b = new Bounty({
            id,
            index: args.index,
            proposer: ev.signer != null ? batch.touch(ev.signer, ev.height) : undefined,
            value: 0n,
            status: 'proposed',
            createdAt: ev.height,
            updatedAt: ev.height,
            timeline: [],
        })
        pushTimeline(b, 'proposed', ev.height)
        batch.bounties.set(id, b)
        return
    }
    const b = batch.bounties.get(id)
    if (b == null) return
    b.updatedAt = ev.height
    switch (ev.name) {
        case 'Bounties.BountyApproved':
            b.status = 'approved'
            pushTimeline(b, 'approved', ev.height)
            break
        case 'Bounties.BountyBecameActive':
            b.status = 'funded'
            pushTimeline(b, 'funded', ev.height)
            break
        case 'Bounties.CuratorProposed':
            b.status = 'curator_proposed'
            b.curator = new Account({id: args.curator})
            pushTimeline(b, 'curator proposed', ev.height)
            break
        case 'Bounties.CuratorAccepted':
            b.status = 'active'
            b.curator = new Account({id: args.curator})
            pushTimeline(b, 'curator accepted', ev.height)
            break
        case 'Bounties.CuratorUnassigned':
            b.status = 'funded'
            b.curator = null
            pushTimeline(b, 'curator unassigned', ev.height)
            break
        case 'Bounties.BountyAwarded':
            b.status = 'pending_payout'
            b.beneficiary = new Account({id: args.beneficiary})
            pushTimeline(b, 'awarded', ev.height)
            break
        case 'Bounties.BountyClaimed':
            b.status = 'claimed'
            b.payout = BigInt(args.payout)
            b.beneficiary = new Account({id: args.beneficiary})
            pushTimeline(b, 'claimed', ev.height)
            break
        case 'Bounties.BountyRejected':
            b.status = 'rejected'
            pushTimeline(b, 'rejected', ev.height)
            break
        case 'Bounties.BountyCanceled':
            b.status = 'cancelled'
            pushTimeline(b, 'cancelled', ev.height)
            break
        case 'Bounties.BountyExtended':
            pushTimeline(b, 'extended', ev.height)
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
                status: 'added',
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
            c.status = 'pending_payout'
            c.beneficiary = new Account({id: args.beneficiary})
            break
        case 'ChildBounties.Claimed':
            c.status = 'claimed'
            c.payout = BigInt(args.payout)
            c.beneficiary = new Account({id: args.beneficiary})
            break
        case 'ChildBounties.Canceled':
            c.status = 'cancelled'
            break
    }
    if (TERMINAL.has(c.status)) c.curatorDeposit = null
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
            b.status = snake(st.__kind)
            b.curator = 'curator' in st ? new Account({id: st.curator}) : null
            b.beneficiary = st.__kind === 'PendingPayout' ? new Account({id: st.beneficiary}) : b.beneficiary
            b.updateDue = st.__kind === 'Active' ? st.updateDue : null
            b.unlockAt = st.__kind === 'PendingPayout' ? st.unlockAt : null
        })
    }
    const children = [...batch.childBounties.values()].filter(c => !TERMINAL.has(c.status))
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
            c.status = snake(st.__kind)
            c.curator = 'curator' in st ? new Account({id: st.curator}) : null
            c.beneficiary = st.__kind === 'PendingPayout' ? new Account({id: st.beneficiary}) : c.beneficiary
        })
    }
}

function snake(kind: string): string {
    return kind.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase()
}

function decodeUtf8(hex: unknown): string | undefined {
    if (typeof hex !== 'string' || !hex.startsWith('0x')) return undefined
    const text = Buffer.from(hex.slice(2), 'hex').toString('utf8')
    return text.length > 0 && !text.includes('�') ? text : undefined
}
