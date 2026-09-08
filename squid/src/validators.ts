import {toJSON} from '@subsquid/util-internal-json'
import {In} from 'typeorm'
import {BatchData} from './batch'
import {Validator} from './model'
import {storage} from './types'

export function collectValidatorEvent(batch: BatchData, name: string, args: any, height: number): void {
    if (name === 'Session.NewSession') {
        batch.sessionBoundaries.push({index: Number(args.sessionIndex), height})
        return
    }
    if (name.startsWith('Validator.')) batch.validatorEvents.push({name, args, height})
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
            lastActiveSession: 0,
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

export async function finalizeValidators(ctx: {store: any}, batch: BatchData, lastHeader: any): Promise<void> {
    for (const ev of batch.validatorEvents) {
        const method = ev.name.split('.')[1]
        const args = ev.args
        switch (method) {
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
                break
            }
        }
    }
    if (batch.sessionBoundaries.length > 0) {
        await syncActiveSet(ctx, batch, lastHeader, batch.sessionBoundaries[batch.sessionBoundaries.length - 1])
    }
}

async function syncActiveSet(ctx: {store: any}, batch: BatchData, lastHeader: any, boundary: {index: number; height: number}): Promise<void> {
    const s = storage.session.validators.v100
    if (!s.is(lastHeader)) throw new Error('unhandled spec version for session validators')
    const current: string[] = (await s.get(lastHeader)) ?? []
    const set = new Set(current)

    const previouslyActive: Validator[] = await ctx.store.find(Validator, {
        where: {active: true},
        relations: {account: true},
    })
    for (const v of previouslyActive) {
        if (!set.has(v.id)) {
            v.active = false
            batch.validators.set(v.id, v)
        }
    }
    for (const who of current) {
        const v = await loadValidator(ctx, batch, who, boundary.height)
        v.active = true
        v.kicked = null
        v.lastActiveSession = boundary.index
    }

    const counts = storage.validator.offlineSessionCount.v100
    if (counts.is(lastHeader) && current.length > 0) {
        const offline = await counts.getMany(lastHeader, current)
        current.forEach((who, i) => {
            const v = batch.validators.get(who)
            if (v != null) v.offlineSessions = offline[i] ?? 0
        })
    }
}
