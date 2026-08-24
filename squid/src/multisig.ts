import {In} from 'typeorm'
import {Store} from '@subsquid/typeorm-store'
import {MultisigOp} from './model'
import {BatchData} from './batch'
import {storage} from './types'

// events drive the lifecycle, every state change since genesis emits
// NewMultisig, MultisigApproval, MultisigExecuted or MultisigCancelled, then
// storage at the batch head fills the deposit of whatever is still open

export interface MsigEvent {
    name: string
    args: any
    height: number
    extrinsic?: {id: string; indexInBlock: number}
}

export function collectMultisigCall(batch: BatchData, name: string, args: any, origin: string, extrinsicId: string): void {
    if (name !== 'Multisig.as_multi' && name !== 'Multisig.approve_as_multi') return
    const others: string[] = args.otherSignatories ?? []
    const list = batch.msigCalls.get(extrinsicId) ?? []
    list.push({threshold: args.threshold, signatories: [origin, ...others].sort()})
    batch.msigCalls.set(extrinsicId, list)
}

export function collectMultisigEvent(batch: BatchData, name: string, args: any, height: number, extrinsic?: {id: string; indexInBlock: number}): void {
    if (!name.startsWith('Multisig.')) return
    // a poke names neither the multisig account nor the timepoint, so the
    // operation is found by depositor and call hash and reread with the rest
    if (name === 'Multisig.DepositPoked') {
        batch.touch(args.who, height)
        batch.msigPokes.push({depositor: args.who, callHash: args.callHash})
        return
    }
    batch.touch(args.approving ?? args.cancelling, height)
    batch.touch(args.multisig, height)
    batch.msigEvents.push({name, args, height, extrinsic})
}

export async function finalizeMultisig(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    if (batch.msigEvents.length === 0 && batch.msigPokes.length === 0) return
    const wanted = new Set<string>()
    for (const ev of batch.msigEvents) {
        const id = opId(ev)
        if (id != null && !batch.msigOps.has(id)) wanted.add(id)
    }
    if (wanted.size > 0) {
        // relations come too, since an op that is only updated here is written
        // back whole and a relation nobody loaded writes its column away
        const rows = await store.find(MultisigOp, {
            where: {id: In([...wanted])},
            relations: {multisig: true, depositor: true},
        })
        for (const op of rows) batch.msigOps.set(op.id, op)
    }
    for (const ev of batch.msigEvents) applyMsigEvent(batch, ev)
    await loadPoked(batch, store)
    await readDeposits(batch, lastHeader)
}

async function loadPoked(batch: BatchData, store: Store): Promise<void> {
    if (batch.msigPokes.length === 0) return
    const rows = await store.find(MultisigOp, {
        where: batch.msigPokes.map(p => ({depositor: {id: p.depositor}, callHash: p.callHash, status: 'pending'})),
        relations: {multisig: true, depositor: true},
    })
    for (const op of rows) if (!batch.msigOps.has(op.id)) batch.msigOps.set(op.id, op)
}

// the chain files the exact deposit next to the pending call, so the amount is
// read back rather than recomputed from the runtime constants
async function readDeposits(batch: BatchData, lastHeader: any): Promise<void> {
    const pending: MultisigOp[] = []
    for (const op of batch.msigOps.values()) {
        if (op.status === 'pending') pending.push(op)
        else op.deposit = null
    }
    if (pending.length === 0) return
    const s = storage.multisig.multisigs.v100
    if (!s.is(lastHeader)) throw new Error('unhandled spec version for multisigs')
    const infos = await s.getMany(lastHeader, pending.map(op => [op.multisig.id, op.callHash] as [string, string]))
    pending.forEach((op, i) => {
        op.deposit = infos[i]?.deposit ?? null
    })
}

// pending operations are keyed by the timepoint of their opening extrinsic,
// which every follow up event carries, so the id survives reopening the same
// call hash after execution
function opId(ev: MsigEvent): string | undefined {
    if (ev.name === 'Multisig.NewMultisig') {
        if (ev.extrinsic == null) return undefined
        return `${ev.args.multisig}-${ev.args.callHash}-${ev.height}-${ev.extrinsic.indexInBlock}`
    }
    const t = ev.args.timepoint
    return `${ev.args.multisig}-${ev.args.callHash}-${t.height}-${t.index}`
}

function applyMsigEvent(batch: BatchData, ev: MsigEvent): void {
    const id = opId(ev)
    if (id == null) return
    const args = ev.args
    if (ev.name === 'Multisig.NewMultisig') {
        const calls = ev.extrinsic != null ? (batch.msigCalls.get(ev.extrinsic.id) ?? []) : []
        // batched extrinsics can open several operations, attribution is only
        // safe when exactly one multisig call is present
        const info = calls.length === 1 ? calls[0] : undefined
        batch.msigOps.set(
            id,
            new MultisigOp({
                id,
                multisig: batch.touch(args.multisig, ev.height),
                callHash: args.callHash,
                depositor: batch.touch(args.approving, ev.height),
                approvals: [args.approving],
                threshold: info?.threshold,
                signatories: info?.signatories,
                status: 'pending',
                createdBlock: ev.height,
                updatedBlock: ev.height,
            })
        )
        return
    }
    const op = batch.msigOps.get(id)
    if (op == null) return
    op.updatedBlock = ev.height
    switch (ev.name) {
        case 'Multisig.MultisigApproval':
            if (!op.approvals.includes(args.approving)) op.approvals = [...op.approvals, args.approving]
            break
        case 'Multisig.MultisigExecuted':
            if (!op.approvals.includes(args.approving)) op.approvals = [...op.approvals, args.approving]
            op.status = 'executed'
            op.result = args.result?.__kind === 'Err' ? 'err' : 'ok'
            break
        case 'Multisig.MultisigCancelled':
            op.status = 'cancelled'
            break
    }
}
