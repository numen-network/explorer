import {Store} from '@subsquid/typeorm-store'
import {In, Not} from 'typeorm'
import {Username, UsernameAuthority} from './model'
import {BatchData} from './batch'
import {storage} from './types'
import type {Provider} from './types/v100'
import {decodeUtf8} from './utf8'
import {seatHolder} from './annotations'

export interface UsernameEvent {
    name: string
    args: any
    height: number
    at: Date
    header: any
}

const NAMED = ['UsernameSet', 'UsernameQueued', 'PrimaryUsernameSet', 'DanglingUsernameRemoved', 'UsernameUnbound', 'UsernameRemoved', 'UsernameKilled']
const DROPPED = ['UsernameRemoved', 'UsernameKilled']

export function collectUsernameEvent(batch: BatchData, name: string, args: any, height: number, at: Date, header: any): void {
    if (!name.startsWith('Identity.')) return
    const short = name.slice('Identity.'.length)
    if (NAMED.includes(short) || ['AuthorityAdded', 'AuthorityRemoved', 'PreapprovalExpired'].includes(short)) batch.usernameEvents.push({name: short, args, height, at, header})
}

const hexOf = (name: string) => `0x${Buffer.from(name, 'utf8').toString('hex')}`

function nameOf(hex: unknown): string {
    const name = decodeUtf8(hex)
    if (name == null) throw new Error(`username ${hex} is not utf8`)
    return name
}

const suffixOf = (name: string) => name.slice(name.lastIndexOf('.') + 1)

function providerFields(p: Provider): {provider: string; deposit: bigint | null} {
    return {provider: p.__kind, deposit: p.__kind === 'AuthorityDeposit' ? p.value : null}
}

export async function finalizeUsernames(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    if (batch.usernameEvents.length === 0) return
    await finalizeAuthorities(batch, lastHeader, store)
    await finalizeNames(batch, lastHeader, store)
}

// AuthorityAdded and AuthorityRemoved name the account only, so the suffixes
// they moved are read off the authority map at their own block
async function finalizeAuthorities(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    const s = storage.identity.authorityOf.v100
    const stored = new Map((await store.find(UsernameAuthority, {})).map(a => [a.id, a]))
    let present = new Set(stored.keys())
    const added = new Map<string, {height: number; at: Date}>()
    for (const e of batch.usernameEvents) {
        if (e.name !== 'AuthorityAdded' && e.name !== 'AuthorityRemoved') continue
        if (!s.is(e.header)) throw new Error(`unhandled spec version for username authorities at block ${e.height}`)
        const now = new Set((await s.getKeys(e.header)).map(nameOf))
        for (const sfx of now) if (!present.has(sfx)) added.set(sfx, {height: e.height, at: e.at})
        present = now
    }
    if (!s.is(lastHeader)) throw new Error('unhandled spec version for username authorities')
    const live = new Map<string, UsernameAuthority>()
    for (const [key, props] of await s.getPairs(lastHeader)) {
        if (props == null) continue
        const id = nameOf(key)
        const a = (added.has(id) ? null : stored.get(id)) ?? new UsernameAuthority({id, usernameCount: 0, addedBlock: added.get(id)?.height ?? null, addedAt: added.get(id)?.at ?? null})
        a.account = await seatHolder(batch, store, props.accountId, added.get(id)?.height ?? batch.blocks[0].height)
        a.allocation = props.allocation
        live.set(id, a)
    }
    batch.usernameAuthorities = [...live.values()]
    batch.usernameAuthorityRemovals = [...stored.keys()].filter(id => !live.has(id))
}

async function finalizeNames(batch: BatchData, lastHeader: any, store: Store): Promise<void> {
    const touched = new Set<string>()
    const owners = new Set<string>()
    // the grant a name dates from, cleared when the chain drops the name so a
    // regrant in the same batch starts over
    const granted = new Map<string, {height: number; at: Date}>()
    const dropped = new Set<string>()
    for (const e of batch.usernameEvents) {
        if (e.name === 'PreapprovalExpired') {
            const pending = await store.find(Username, {where: {owner: {id: e.args.whose}, status: 'Pending'}})
            for (const u of pending) touched.add(u.id)
            owners.add(e.args.whose)
            continue
        }
        if (!NAMED.includes(e.name)) continue
        const name = nameOf(e.args.username)
        touched.add(name)
        if (e.args.who != null) owners.add(e.args.who)
        if ((e.name === 'UsernameQueued' || e.name === 'UsernameSet') && !granted.has(name)) granted.set(name, {height: e.height, at: e.at})
        if (DROPPED.includes(e.name)) {
            granted.delete(name)
            dropped.add(name)
        }
    }
    const names = [...touched]
    const keys = names.map(hexOf)
    const infoStore = storage.identity.usernameInfoOf.v100
    const pendingStore = storage.identity.pendingUsernames.v100
    const unbindingStore = storage.identity.unbindingUsernames.v100
    if (!infoStore.is(lastHeader) || !pendingStore.is(lastHeader) || !unbindingStore.is(lastHeader)) throw new Error('unhandled spec version for usernames')
    const [infos, pendings, unbindings, previous] = await Promise.all([
        infoStore.getMany(lastHeader, keys),
        pendingStore.getMany(lastHeader, keys),
        unbindingStore.getMany(lastHeader, keys),
        store.find(Username, {where: {id: In(names)}, relations: {owner: true}}),
    ])
    const before = new Map(previous.map(u => [u.id, u]))
    for (const u of previous) owners.add(u.owner.id)

    const rows = new Map<string, Username>()
    const removed: string[] = []
    for (const [i, name] of names.entries()) {
        const info = infos[i]
        const pending = pendings[i]
        if (info == null && pending == null) {
            if (before.has(name)) removed.push(name)
            continue
        }
        const grant = granted.get(name)
        const kept = dropped.has(name) ? undefined : before.get(name)
        if (kept == null && grant == null) throw new Error(`username ${name} has no grant behind it`)
        const owner = info?.owner ?? pending![0]
        owners.add(owner)
        rows.set(
            name,
            new Username({
                id: name,
                owner: await seatHolder(batch, store, owner, grant?.height ?? batch.blocks[0].height),
                suffix: suffixOf(name),
                status: pending != null ? 'Pending' : unbindings[i] != null ? 'Unbinding' : 'Active',
                expiresAt: pending?.[1] ?? unbindings[i] ?? null,
                ...providerFields(info?.provider ?? pending![2]),
                primary: false,
                grantedBlock: kept?.grantedBlock ?? grant!.height,
                grantedAt: kept?.grantedAt ?? grant!.at,
            })
        )
    }

    // a new primary demotes the old one, which may be a name the batch never touched
    const primaryStore = storage.identity.usernameOf.v100
    if (!primaryStore.is(lastHeader)) throw new Error('unhandled spec version for usernames')
    const ownerIds = [...owners]
    const primaries = new Map((await primaryStore.getMany(lastHeader, ownerIds)).map((p, i) => [ownerIds[i], p != null ? nameOf(p) : null]))
    const siblings = await store.find(Username, {where: {owner: {id: In(ownerIds)}, id: Not(In(names))}, relations: {owner: true}})
    for (const u of siblings) {
        const primary = primaries.get(u.owner.id) === u.id
        if (u.primary !== primary) rows.set(u.id, Object.assign(u, {primary}))
    }
    for (const u of rows.values()) u.primary = primaries.get(u.owner.id) === u.id

    batch.usernames = [...rows.values()]
    batch.usernameRemovals = removed
}

// the count stands for the names under the suffix once this batch is written
export async function persistUsernames(store: Store, batch: BatchData): Promise<void> {
    if (batch.usernameEvents.length === 0) return
    await store.upsert(batch.usernames)
    if (batch.usernameRemovals.length > 0) await store.remove(Username, batch.usernameRemovals)
    for (const a of batch.usernameAuthorities) a.usernameCount = await store.count(Username, {where: {suffix: a.id, status: Not('Pending')}})
    await store.upsert(batch.usernameAuthorities)
    if (batch.usernameAuthorityRemovals.length > 0) await store.remove(UsernameAuthority, batch.usernameAuthorityRemovals)
}
