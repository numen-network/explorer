import {toJSON} from '@subsquid/util-internal-json'
import {In} from 'typeorm'
import {BatchData} from './batch'
import {Validator, ValidatorOffence} from './model'
import {storage} from './types'

export function collectValidatorEvent(batch: BatchData, id: string, name: string, args: any, height: number, at: Date, header: any): void {
    if (name === 'Session.NewSession' || name === 'ImOnline.SomeOffline' || name.startsWith('Validator.')) batch.validatorEvents.push({id, name, args, height, at, header})
}

function recordOffence(batch: BatchData, v: Validator, id: string, kind: string, ev: {height: number; at: Date}): void {
    batch.validatorOffences.push(new ValidatorOffence({id, validator: v, kind, block: ev.height, timestamp: ev.at}))
}

async function loadValidator(ctx: {store: any}, batch: BatchData, who: string, height: number): Promise<Validator> {
    let v = batch.validators.get(who)
    if (v != null) return v
    v = await ctx.store.get(Validator, who)
    if (v == null) {
        v = new Validator({
            id: who,
            account: batch.touch(who, height),
            active: false,
            lockedAmount: 0n,
            offlineSessions: 0,
            equivocations: 0,
            firstSeenBlock: height,
            lastActiveSession: null,
        })
    }
    batch.validators.set(who, v)
    return v
}

// the genesis set never gets a NewSession of its own, so it is read where it
// was written
export async function seedGenesisValidators(batch: BatchData, genesisHeader: any): Promise<void> {
    const s = storage.session.validators.v100
    if (!s.is(genesisHeader)) throw new Error('unhandled spec version for session validators at genesis')
    for (const who of (await s.get(genesisHeader)) ?? []) {
        batch.validators.set(
            who,
            new Validator({
                id: who,
                account: batch.touch(who, 0),
                active: true,
                lockedAmount: 0n,
                offlineSessions: 0,
                equivocations: 0,
                firstSeenBlock: 0,
                lastActiveSession: 0,
            })
        )
    }
}

// session boundaries apply in chain order among the lifecycle events, each with
// the set its own block holds, so a batch spanning several sessions ends up
// where as many one-session batches would
export async function finalizeValidators(ctx: {store: any}, batch: BatchData): Promise<void> {
    for (const ev of batch.validatorEvents) {
        const method = ev.name.split('.')[1]
        const args = ev.args
        switch (method) {
            case 'NewSession':
                await syncActiveSet(ctx, batch, Number(args.sessionIndex), ev.height, ev.header)
                break
            case 'ValidatorLocked': {
                const v = await loadValidator(ctx, batch, args.who, ev.height)
                v.lockedAmount = BigInt(args.amount)
                v.lockExpiry = Number(args.expiryBlock)
                break
            }
            case 'LockReleased': {
                const v = await loadValidator(ctx, batch, args.who, ev.height)
                v.lockedAmount = 0n
                v.lockExpiry = null
                break
            }
            case 'ValidatorKicked': {
                const v = await loadValidator(ctx, batch, args.who, ev.height)
                v.kicked = toJSON(args.reason)
                v.active = false
                break
            }
            case 'EquivocationReported': {
                const v = await loadValidator(ctx, batch, args.who, ev.height)
                v.equivocations += 1
                recordOffence(batch, v, ev.id, 'Equivocation', ev)
                break
            }
            case 'SomeOffline':
                for (const [who] of args.offline) {
                    const v = await loadValidator(ctx, batch, who, ev.height)
                    v.offlineSessions += 1
                    recordOffence(batch, v, `${ev.id}-${who}`, 'Offline', ev)
                }
                break
        }
    }
}

async function syncActiveSet(ctx: {store: any}, batch: BatchData, index: number, height: number, header: any): Promise<void> {
    const s = storage.session.validators.v100
    if (!s.is(header)) throw new Error(`unhandled spec version for session validators at block ${height}`)
    const current: string[] = (await s.get(header)) ?? []
    const set = new Set(current)

    // the store holds the set earlier batches left, the batch whatever it has
    // changed since
    const stored: Validator[] = await ctx.store.find(Validator, {where: {active: true}, relations: {account: true}})
    const active = new Map(stored.map(v => [v.id, v]))
    for (const v of batch.validators.values()) {
        if (v.active) active.set(v.id, v)
        else active.delete(v.id)
    }
    for (const v of active.values()) {
        if (!set.has(v.id)) {
            v.active = false
            batch.validators.set(v.id, v)
        }
    }
    for (const who of current) {
        const v = await loadValidator(ctx, batch, who, height)
        v.active = true
        v.kicked = null
        v.lastActiveSession = index
    }
}
