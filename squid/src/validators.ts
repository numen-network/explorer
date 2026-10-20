import {toJSON} from '@subsquid/util-internal-json'
import {In} from 'typeorm'
import {BatchData} from './batch'
import {Event, Validator, ValidatorOffence, ValidatorStep} from './model'
import {storage} from './types'

export function collectValidatorEvent(batch: BatchData, id: string, name: string, phase: string, args: any, height: number, at: Date, header: any): void {
    if (name === 'Session.NewSession' || name === 'ImOnline.SomeOffline' || name.startsWith('Validator.')) batch.validatorEvents.push({id, name, phase, args, height, at, header})
}

function recordOffence(batch: BatchData, v: Validator, id: string, kind: string, ev: {id: string; height: number; at: Date}): void {
    batch.validatorOffences.push(new ValidatorOffence({id, validator: v, kind, event: new Event({id: ev.id}), block: ev.height, timestamp: ev.at}))
}

async function latestStep(ctx: {store: any}, batch: BatchData, who: string): Promise<ValidatorStep | undefined> {
    const known = batch.latestSteps.get(who)
    if (known != null) return known
    const stored: ValidatorStep | undefined = await ctx.store.findOne(ValidatorStep, {where: {account: {id: who}}, order: {id: 'DESC'}})
    if (stored != null) batch.latestSteps.set(who, stored)
    return stored
}

// on_initialize raises the daily auto-renewal, which joins the run the
// account's latest step holds
async function recordStep(ctx: {store: any}, batch: BatchData, ev: {id: string; name: string; phase: string; args: any; height: number}): Promise<void> {
    const who: string = ev.args.who
    const renewal = ev.name === 'Validator.ValidatorLocked' && ev.phase === 'Initialization'
    const last = renewal ? await latestStep(ctx, batch, who) : undefined
    const step =
        last != null && last.renewals > 0
            ? last
            : new ValidatorStep({id: ev.id, account: batch.touch(who, ev.height), event: new Event({id: ev.id}), renewals: 0})
    step.lastEvent = new Event({id: ev.id})
    if (renewal) step.renewals += 1
    batch.latestSteps.set(who, step)
    batch.validatorSteps.set(step.id, step)
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
            firstSeenBlock: height,
            lastActiveSession: null,
        })
    }
    batch.validators.set(who, v)
    return v
}

// the genesis set never gets a NewSession of its own, nor its locks and
// exemptions an event, so they are read where they were written
export async function seedGenesisValidators(batch: BatchData, genesisHeader: any): Promise<void> {
    const s = storage.session.validators.v100
    const locks = storage.validator.validatorLocks.v100
    const exempt = storage.validator.stakeExemptAccounts.v100
    if (!s.is(genesisHeader) || !locks.is(genesisHeader) || !exempt.is(genesisHeader)) throw new Error('unhandled spec version for validators at genesis')
    const set = (await s.get(genesisHeader)) ?? []
    const lockOf = await locks.getMany(genesisHeader, set)
    const exemptOf = await exempt.getMany(genesisHeader, set)
    set.forEach((who, i) => {
        const lock = lockOf[i]
        const account = batch.touch(who, 0)
        batch.validators.set(
            who,
            new Validator({
                id: who,
                account,
                active: true,
                lockedAmount: lock?.amount ?? 0n,
                lockExpiry: lock?.expiryBlock ?? null,
                firstSeenBlock: 0,
                lastActiveSession: 0,
            })
        )
        const step = new ValidatorStep({
            id: `0000000000-${who}`,
            account,
            event: null,
            lastEvent: null,
            renewals: 0,
            genesisLock: lock == null ? null : toJSON(lock),
            genesisExempt: exemptOf[i] !== undefined,
        })
        batch.latestSteps.set(who, step)
        batch.validatorSteps.set(step.id, step)
    })
}

// session boundaries apply in chain order among the lifecycle events, each with
// the set its own block holds, so a batch spanning several sessions ends up
// where as many one-session batches would
export async function finalizeValidators(ctx: {store: any}, batch: BatchData): Promise<void> {
    for (const ev of batch.validatorEvents) {
        if (ev.name.startsWith('Validator.')) await recordStep(ctx, batch, ev)
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
                recordOffence(batch, v, ev.id, 'Equivocation', ev)
                break
            }
            case 'SomeOffline':
                for (const [who] of args.offline) {
                    const v = await loadValidator(ctx, batch, who, ev.height)
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
