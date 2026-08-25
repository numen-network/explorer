import {toJSON} from '@subsquid/util-internal-json'
import {In} from 'typeorm'
import {Store} from '@subsquid/typeorm-store'
import {Account, Delegation, IdentityStatus, Judgement, PrimeState, ProxyRelation, Registrar, Track} from './model'
import {BatchData} from './batch'
import {events, storage} from './types'

type ChainEvent = Parameters<(typeof events.convictionVoting.delegated.v100)['is']>[0]

function registrarStat(batch: BatchData, index: number, at: Date) {
    let s = batch.registrarStats.get(index)
    if (s == null) {
        s = {requests: 0, given: 0, block: 0, at}
        batch.registrarStats.set(index, s)
    }
    return s
}

export function collectAnnotationEvent(batch: BatchData, id: string, name: string, args: any, height: number, at: Date, ev: ChainEvent): void {
    switch (name) {
        case 'Identity.RegistrarAdded':
            batch.registrarAdded.set(args.registrarIndex, height)
            batch.registrarsDirty = true
            break
        case 'Identity.JudgementRequested':
            registrarStat(batch, args.registrarIndex, at).requests += 1
            break
        case 'Identity.IdentitySet':
        case 'Identity.JudgementGiven': {
            const who = args.who ?? args.target
            batch.touch(who, height)
            batch.identityRefresh.add(who)
            if (name === 'Identity.JudgementGiven') {
                const s = registrarStat(batch, args.registrarIndex, at)
                s.given += 1
                s.block = height
                s.at = at
                batch.judgementsGiven.push({id, registrar: args.registrarIndex, target: who, block: height, at})
            }
            break
        }
        case 'Identity.IdentityCleared':
        case 'Identity.IdentityKilled':
            batch.touch(args.who, height)
            batch.identityRefresh.add(args.who)
            batch.subsReset.add(args.who)
            break
        case 'Identity.SubIdentityAdded':
        case 'Identity.SubIdentityRemoved':
        case 'Identity.SubIdentityRevoked':
            batch.touch(args.main, height)
            batch.touch(args.sub, height)
            batch.superRefresh.add(args.sub)
            break
        case 'Identity.UsernameSet':
        case 'Identity.PrimaryUsernameSet':
        case 'Identity.DanglingUsernameRemoved':
            batch.touch(args.who, height)
            batch.usernameRefresh.add(args.who)
            break
        // these carry only the username, the owner is looked up from the store
        case 'Identity.UsernameUnbound':
        case 'Identity.UsernameRemoved':
        case 'Identity.UsernameKilled': {
            const name = decodeUtf8(args.username)
            if (name != null) batch.usernameDrop.add(name)
            break
        }
        case 'Vesting.VestingCreated':
        case 'Vesting.VestingUpdated':
        case 'Vesting.VestingCompleted':
            batch.touch(args.account, height)
            batch.vestingRefresh.add(args.account)
            break
        case 'Prime.KeyChanged':
            batch.touch(args.old, height)
            batch.touch(args.new, height)
            batch.primeChanged = height
            break
        case 'Proxy.ProxyAdded':
        case 'Proxy.ProxyRemoved':
            batch.touch(args.delegator, height)
            batch.touch(args.delegatee, height)
            batch.proxyRefresh.add(args.delegator)
            break
        case 'Proxy.PureCreated':
            batch.touch(args.pure, height)
            batch.touch(args.who, height)
            batch.proxyRefresh.add(args.pure)
            break
        case 'Proxy.PureKilled':
            batch.touch(args.pure, height)
            batch.touch(args.spawner, height)
            batch.proxyRefresh.add(args.pure)
            break
        case 'ConvictionVoting.Delegated': {
            const shape = events.convictionVoting.delegated.v100
            if (!shape.is(ev)) throw new Error(`unhandled ConvictionVoting.Delegated shape at block ${height}`)
            const [who, target, track] = shape.decode(ev)
            batch.touch(who, height)
            batch.touch(target, height)
            batch.delegationRefresh.set(`${who}|${track}`, height)
            break
        }
        case 'ConvictionVoting.Undelegated': {
            const shape = events.convictionVoting.undelegated.v100
            if (!shape.is(ev)) throw new Error(`unhandled ConvictionVoting.Undelegated shape at block ${height}`)
            const [who, track] = shape.decode(ev)
            batch.touch(who, height)
            batch.delegationRefresh.set(`${who}|${track}`, height)
            break
        }
    }
}

// set_subs rewrites the whole sub list without emitting events, rename_sub
// and remove_proxies are silent too, so all are picked up at the call level
export function collectAnnotationCall(batch: BatchData, name: string, args: any, origin: string, height: number): void {
    switch (name) {
        case 'Proxy.remove_proxies':
            batch.proxyRefresh.add(origin)
            break
        case 'Identity.set_subs':
            batch.subsReset.add(origin)
            for (const [sub] of args.subs ?? []) {
                batch.touch(sub, height)
                batch.superRefresh.add(sub)
            }
            break
        case 'Identity.set_fee':
        case 'Identity.set_account_id':
        case 'Identity.set_fields':
            batch.registrarsDirty = true
            break
        case 'Identity.rename_sub': {
            const sub = args.sub?.value ?? args.sub
            if (typeof sub === 'string') {
                batch.touch(sub, height)
                batch.superRefresh.add(sub)
            }
            break
        }
    }
}

const GOOD = new Set(['KnownGood', 'Reasonable'])
const FLAG = new Set(['Erroneous', 'LowQuality'])

function judgementOf(json: unknown, registrar: number): {kind?: string; fee?: bigint} {
    const raw = (json as {judgements?: [number, {__kind: string; value?: string}][]})?.judgements ?? []
    const found = raw.find(([i]) => i === registrar)?.[1]
    return {kind: found?.__kind, fee: found?.value != null ? BigInt(found.value) : undefined}
}

// the three buckets coarsen the five state badge the web draws per account, so
// a row can never sit in a bucket its own badge contradicts
function judgementStatus(judgements: [number, {__kind: string}][] | undefined): IdentityStatus {
    let good = false
    for (const [, j] of judgements ?? []) {
        if (FLAG.has(j.__kind)) return IdentityStatus.FLAGGED
        if (GOOD.has(j.__kind)) good = true
    }
    return good ? IdentityStatus.VERIFIED : IdentityStatus.UNVERIFIED
}

// only the fee, the account and the field mask ever move, so the whole short
// list is reread rather than tracked slot by slot
export async function finalizeRegistrars(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    const stats = batch.registrarStats
    const known = new Map(
        stats.size > 0 ? (await store.find(Registrar, {where: {index: In([...stats.keys()])}})).map(r => [r.index, r]) : []
    )
    // a counter for a registrar we have never seen means the list is behind
    if ([...stats.keys()].some(i => !known.has(i))) batch.registrarsDirty = true

    if (batch.registrarsDirty) {
        const s = storage.identity.registrars.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for registrars')
        const list = (await s.get(lastHeader)) ?? []
        const stored = new Map((await store.find(Registrar, {})).map(r => [r.index, r]))
        list.forEach((info, index) => {
            if (info == null) return
            const r =
                stored.get(index) ??
                known.get(index) ??
                new Registrar({
                    id: String(index),
                    index,
                    fee: 0n,
                    fields: 0n,
                    addedAt: batch.registrarAdded.get(index) ?? lastHeader.height,
                    requestCount: 0,
                    givenCount: 0,
                })
            r.account = batch.touch(info.account, lastHeader.height)
            r.fee = info.fee
            r.fields = info.fields
            known.set(index, r)
        })
    }
    for (const [index, s] of stats) {
        const r = known.get(index)
        if (r == null) throw new Error(`judgement counter for unknown registrar ${index}`)
        r.requestCount += s.requests
        r.givenCount += s.given
        if (s.block > 0) {
            r.lastJudgementBlock = s.block
            r.lastJudgementAt = s.at
        }
    }
    batch.registrars = [...known.values()]
}

export async function seedGenesisVesting(batch: BatchData, genesisHeader: any): Promise<void> {
    const s = storage.vesting.vesting.v100
    if (!s.is(genesisHeader)) return
    const pairs = await s.getPairs(genesisHeader)
    for (const [who, schedules] of pairs) {
        const a = batch.touch(who, 0)
        a.vestingJson = toJSON(schedules)
    }
}

export async function finalizeAnnotations(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    // collect already touched every target, annotations must not look like account activity
    const entity = (id: string) => {
        const a = batch.accounts.get(id)
        if (a == null) throw new Error(`annotation target ${id} missing from batch accounts`)
        return a
    }
    if (batch.subsReset.size > 0) {
        // a rewritten sub list may have dropped subs the batch never saw, pull
        // the previous children from the store and reread their super link,
        // added to the batch directly so their activity height stays put
        const children = await store.find(Account, {where: {identitySuper: {id: In([...batch.subsReset])}}})
        for (const c of children) {
            if (!batch.accounts.has(c.id)) batch.accounts.set(c.id, c)
            batch.superRefresh.add(c.id)
        }
    }
    if (batch.superRefresh.size > 0) {
        const s = storage.identity.superOf.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for identity super')
        const who = [...batch.superRefresh]
        const supers = await s.getMany(lastHeader, who)
        who.forEach((id, i) => {
            const a = entity(id)
            const reg = supers[i]
            // a column only clears on null, upsert skips it when undefined
            a.identitySuper = reg ? new Account({id: reg[0]}) : null
            a.identitySubName = reg ? decodeIdentityData(reg[1]) : null
        })
    }
    // a cleared identity is just an empty registration read back, so it rides
    // the same refresh
    if (batch.identityRefresh.size > 0) {
        const s = storage.identity.identityOf.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for identity')
        const who = [...batch.identityRefresh]
        const regs = await s.getMany(lastHeader, who)
        who.forEach((id, i) => {
            const a = entity(id)
            const reg = regs[i]
            a.identityDisplay = reg ? decodeIdentityData(reg.info?.display) : null
            a.identityJson = reg ? toJSON(reg) : null
            a.identityStatus = reg ? judgementStatus(reg.judgements) : null
        })
    }
    for (const g of batch.judgementsGiven) {
        batch.judgements.push(
            new Judgement({
                id: g.id,
                registrar: new Registrar({id: String(g.registrar)}),
                target: new Account({id: g.target}),
                ...judgementOf(entity(g.target).identityJson, g.registrar),
                block: g.block,
                timestamp: g.at,
            })
        )
    }
    if (batch.vestingRefresh.size > 0) {
        const s = storage.vesting.vesting.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for vesting')
        const who = [...batch.vestingRefresh]
        const schedules = await s.getMany(lastHeader, who)
        who.forEach((id, i) => {
            const a = entity(id)
            a.vestingJson = schedules[i] != null ? toJSON(schedules[i]) : null
        })
    }
    if (batch.usernameDrop.size > 0) {
        // removal events name the username only, find the owner in the store
        const owners = await store.find(Account, {where: {username: In([...batch.usernameDrop])}})
        for (const a of owners) {
            if (!batch.accounts.has(a.id)) batch.accounts.set(a.id, a)
            batch.usernameRefresh.add(a.id)
        }
    }
    if (batch.usernameRefresh.size > 0) {
        const s = storage.identity.usernameOf.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for usernames')
        const who = [...batch.usernameRefresh]
        const names = await s.getMany(lastHeader, who)
        who.forEach((id, i) => {
            entity(id).username = names[i] != null ? decodeUtf8(names[i]) : null
        })
    }
    if (batch.delegationRefresh.size > 0) {
        const s = storage.convictionVoting.votingFor.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for voting')
        const entries = [...batch.delegationRefresh.entries()]
        const pairs: [string, number][] = entries.map(([k]) => {
            const [who, cls] = k.split('|')
            return [who, Number(cls)]
        })
        const votings = await s.getMany(lastHeader, pairs)
        entries.forEach(([, height], i) => {
            const [who, cls] = pairs[i]
            const id = `${who}-${cls}`
            const v = votings[i]
            if (v?.__kind === 'Delegating') {
                batch.delegations.push(
                    new Delegation({
                        id,
                        who: entity(who),
                        target: new Account({id: v.value.target}),
                        track: new Track({id: String(cls)}),
                        conviction: convictionLabel(v.value.conviction),
                        balance: v.value.balance,
                        block: height,
                    })
                )
            } else {
                batch.delegationRemovals.push(id)
            }
        })
    }
    if (batch.proxyRefresh.size > 0) {
        const s = storage.proxy.proxies.v100
        if (!s.is(lastHeader)) throw new Error('unhandled spec version for proxies')
        const delegators = [...batch.proxyRefresh]
        const existing = await store.find(ProxyRelation, {where: {delegator: {id: In(delegators)}}})
        const current = await s.getMany(lastHeader, delegators)
        const keep = new Set<string>()
        delegators.forEach((d, i) => {
            for (const def of current[i]?.[0] ?? []) {
                const id = `${d}-${def.delegate}-${def.proxyType.__kind}`
                keep.add(id)
                batch.proxyRelations.push(
                    new ProxyRelation({id, delegator: entity(d), delegatee: new Account({id: def.delegate}), proxyType: def.proxyType.__kind, delay: def.delay})
                )
            }
        })
        for (const r of existing) {
            if (!keep.has(r.id)) batch.proxyRemovals.push(r.id)
        }
    }
    await refreshPrime(batch, lastHeader, store)
}

function convictionLabel(c: {__kind: string}): string {
    return c.__kind === 'None' ? '0x' : c.__kind.replace('Locked', '')
}

async function refreshPrime(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    const prev = await store.get(PrimeState, 'prime')
    if (prev != null && batch.primeChanged == null) return
    const s = storage.prime.key.v100
    if (!s.is(lastHeader)) throw new Error('unhandled spec version for prime key')
    const key = await s.get(lastHeader)
    if (key == null) return
    let acc = batch.accounts.get(key) ?? (await store.get(Account, key))
    if (acc == null) {
        // the genesis prime may never have signed anything, seed it from chain state
        const sys = storage.system.account.v100
        const info = sys.is(lastHeader) ? await sys.get(lastHeader, key) : undefined
        acc = new Account({
            id: key,
            free: info?.data.free ?? 0n,
            reserved: info?.data.reserved ?? 0n,
            frozen: info?.data.frozen ?? 0n,
            nonce: info?.nonce ?? 0,
            firstSeenBlock: 0,
            lastActiveBlock: 0,
        })
        batch.accounts.set(key, acc)
    }
    batch.prime = new PrimeState({id: 'prime', account: acc, since: batch.primeChanged ?? prev?.since ?? 0})
}

// Identity Data enum decodes to variants None, Raw0..Raw32, BlakeTwo256 and
// friends. Only raw inline bytes carry a readable value.
function decodeIdentityData(data: any): string | null {
    if (data?.__kind == null || !data.__kind.startsWith('Raw')) return null
    return decodeUtf8(data.value)
}

// null rather than undefined because undefined tells upsert to leave the
// column alone, which would strand the previous value
function decodeUtf8(hex: unknown): string | null {
    if (typeof hex !== 'string' || !hex.startsWith('0x')) return null
    const text = Buffer.from(hex.slice(2), 'hex').toString('utf8')
    return /^[\x20-\x7e]+$/.test(text) ? text : null
}
