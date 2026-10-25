import {acct, at, chainInfo, hashOf, HEAD, identity, numn, paged, person, squidId, subOf} from '../../../../mock/fixtures.js'
import {shortAddr} from '@/components/AddressText'
import {BAD_JUDGEMENTS, GOOD_JUDGEMENTS} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {avatars} from '../../../.storybook/avatar'
import {pageStory} from '../../../.storybook/page'

export type Fields = {judgements?: string[]} & Partial<Record<'avatar' | 'bio' | 'web' | 'email' | 'github' | 'matrix' | 'x' | 'telegram' | 'discord', string>>

export interface Row {
    id: string
    identityDisplay?: string | null
    identityJson: unknown
    username?: string
    subs?: {id: string}[]
}

export const U128_MAX = (2n ** 128n - 1n).toString()
export const INT_MAX = 2 ** 31 - 1
const KINDS = ['KnownGood', 'Reasonable', 'FeePaid', 'Unknown', 'OutOfDate', 'LowQuality', 'Erroneous']

export const registered = (n: number, display: string, fields: Fields = {}): Row => acct(n, identity(display, fields))

export const withSubs = (parent: Row, seed: string, names: (string | null)[]): Row => ({...parent, subs: names.map((name, i) => ({id: hashOf('sub', seed, i), ...subOf(parent, name)}))})

export const registrar = (index: number, traits: object = {}) => ({
    id: String(index),
    index,
    account: person(index),
    fee: numn(25),
    requestCount: 20 + ((index * 37) % 180),
    givenCount: 20 + ((index * 37) % 180) - (index % 4),
    lastJudgementBlock: HEAD - 3_000 * (index + 1),
    lastJudgementAt: at(HEAD - 3_000 * (index + 1)),
    ...traits,
})

export const retired = (index: number, retiredAt: number) => registrar(index, {account: null, fee: null, retiredAt})

const REGISTRARS = [registrar(0), registrar(1, {fee: numn(10)}), retired(2, HEAD - 86_400)]

export const EVERY_VERDICT = [
    registered(11, 'Erroneous', {judgements: ['Erroneous']}),
    registered(12, 'Fee paid', {judgements: ['FeePaid']}),
    registered(13, 'Fee paid and out of date', {judgements: ['FeePaid', 'OutOfDate']}),
    registered(14, 'Known good', {judgements: ['KnownGood']}),
    registered(15, 'Known good and erroneous', {judgements: ['KnownGood', 'Erroneous']}),
    registered(16, 'Low quality', {judgements: ['LowQuality']}),
    registered(17, 'No judgement', {judgements: []}),
    registered(18, 'Out of date', {judgements: ['OutOfDate']}),
    registered(19, 'Out of date and reasonable', {judgements: ['OutOfDate', 'Reasonable']}),
    registered(20, 'Reasonable', {judgements: ['Reasonable']}),
    registered(21, 'Unknown', {judgements: ['Unknown']}),
]

const CHANNEL_SETS: Fields[] = [{web: 'example.org', x: '@example'}, {}, {discord: 'example'}, {github: 'example', matrix: '@example:matrix.org', telegram: '@example'}]
const NAMES = ['Aurora', 'Basalt', 'Cobalt', 'Delta', 'Ember', 'Fathom', 'Granite', 'Helix', 'Ion'].flatMap(a => ['Guild', 'Labs', 'Node', 'Pool', 'Works'].map(b => `${a} ${b}`))

export const MANY = NAMES.map((name, i) => {
    const row = registered(30 + i, name, {judgements: [KINDS[i % KINDS.length]], ...CHANNEL_SETS[i % CHANNEL_SETS.length]})
    return i % 6 ? {...row, subs: []} : withSubs(row, name, ['payouts', 'ops'])
})

const kindsOf = (r: Row) => ((r.identityJson as {judgements?: [number, {__kind: string}][]} | null)?.judgements ?? []).map(([, j]) => j.__kind)
const subCount = (rows: Row[]) => rows.reduce((n, r) => n + (r.subs?.length ?? 0), 0)

const judged = (r: Row, kinds: string[]) => kindsOf(r).some(k => kinds.includes(k))

interface Counts {
    direct: number
    good: number
    bad: number
    both: number
    subs: number
}

const countsOf = (rows: Row[]): Counts => ({
    direct: rows.length,
    good: rows.filter(r => judged(r, GOOD_JUDGEMENTS)).length,
    bad: rows.filter(r => judged(r, BAD_JUDGEMENTS)).length,
    both: rows.filter(r => judged(r, GOOD_JUDGEMENTS) && judged(r, BAD_JUDGEMENTS)).length,
    subs: subCount(rows),
})

interface Where {
    identityJson_isNull?: boolean
    identitySuper_isNull?: boolean
    AND?: unknown[]
    OR?: {identityJson_jsonContains: {judgements: [[{__kind: string}]]}}[]
}

// every tile asks accountsConnection with a filter of its own
const tallies = (c: Counts) => ({where}: {where: Where}) => ({
    totalCount:
        where.identityJson_isNull === false
            ? c.direct
            : where.identitySuper_isNull === false
              ? c.subs
              : where.AND
                ? c.both
                : BAD_JUDGEMENTS.includes(where.OR![0].identityJson_jsonContains.judgements[0][0].__kind)
                  ? c.bad
                  : c.good,
})

export interface Registrar {
    retiredAt?: number | null
    lastJudgementBlock: number | null
}

// the latest judgement tile reads one registrar ordered by its last judgement, the tab reads a page in index order
const registrarRows = (list: Registrar[]) => (args: {orderBy: string[]; limit: number; offset: number}) =>
    args.orderBy[0] === 'lastJudgementBlock_DESC_NULLS_LAST'
        ? list.filter(r => r.lastJudgementBlock != null).sort((a, b) => b.lastJudgementBlock! - a.lastJudgementBlock!).slice(0, 1)
        : paged(list)(args)

export interface Username {
    status: string
}

// a FeePaid entry as the index keeps it, waiting on a seat since the given block
export const request = (who: object, seat: {index: number; account: object | null}, block: number, fee = numn(25)) => ({
    id: `${(who as {id: string}).id}-${seat.index}`,
    kind: 'FeePaid',
    fee,
    timestamp: at(block),
    account: who,
    registrar: seat,
    event: {extrinsic: {id: squidId(block, 1)}},
})

export const identities = (
    rows: Row[],
    {
        counts = countsOf(rows),
        registrars = REGISTRARS as Registrar[],
        pending = [] as object[],
        usernames = [] as Username[],
        authorities = [] as object[],
        tab = 'identities',
        page = '1',
    } = {}
) =>
    pageStory(
        {
            accounts: paged(rows),
            accountsConnection: tallies(counts),
            registrars: registrarRows(registrars),
            registrarsConnection: ({where}: {where?: {retiredAt_isNull?: boolean}}) => ({totalCount: where?.retiredAt_isNull === false ? registrars.filter(r => r.retiredAt != null).length : registrars.length}),
            identityJudgements: paged(pending),
            identityJudgementsConnection: {totalCount: pending.length},
            usernames: paged(usernames),
            usernamesConnection: ({where}: {where?: {status_eq?: string}}) => ({totalCount: usernames.filter(u => where?.status_eq == null || u.status === where.status_eq).length}),
            usernameAuthorities: paged(authorities),
        },
        {searchParams: {tab, page}, msw: [avatars]}
    )

export const tileText = (root: HTMLElement, label: string) => {
    const tile = [...root.querySelectorAll<HTMLElement>('[data-slot=card]')].find(c => c.querySelector('[data-slot=card-description]')?.textContent === label)!
    return [...tile.querySelectorAll('[data-slot=card-description], [data-slot=card-title], [data-slot=card-content]')].map(e => e.textContent)
}

export const short = (row: {id: string}) => shortAddr(ss58Encode(row.id, chainInfo.ss58))

export const bare = (n: number) => acct(n, {identityDisplay: null, identityJson: null})

export const NAMED_OWNER = registered(200, 'Polaris Guild', {judgements: ['KnownGood']})

export const WITH_SUBS = [
    withSubs(registered(90, 'Hundred Subs Collective'), 'hundred', Array.from({length: 100}, (_, i) => `miner-${String(i + 1).padStart(3, '0')}`)),
    withSubs(registered(91, 'Orbit Labs'), 'orbit', ['validator']),
    withSubs(registered(92, 'Polaris Guild', {judgements: ['KnownGood']}), 'polaris', ['payouts', 'treasury desk', null]),
    registered(93, 'Solo'),
]

export const username = (name: string, owner: object, traits: object = {}) => ({
    id: name,
    owner,
    status: 'Active',
    expiresAt: null,
    provider: 'Allocation',
    deposit: null,
    primary: true,
    grantedBlock: HEAD - 1_000,
    grantedAt: at(HEAD - 1_000),
    ...traits,
})

export const EVERY_USERNAME = [
    username('polaris.numen', NAMED_OWNER),
    username('polarispool.numen', NAMED_OWNER, {primary: false, provider: 'AuthorityDeposit', deposit: numn(0.32), grantedBlock: HEAD - 2_000, grantedAt: at(HEAD - 2_000)}),
    username('anon.numen', bare(201), {grantedBlock: HEAD - 3_000, grantedAt: at(HEAD - 3_000)}),
    username('waiting.numen', bare(202), {status: 'Pending', expiresAt: HEAD + 60_000, primary: false, grantedBlock: HEAD - 4_000, grantedAt: at(HEAD - 4_000)}),
    username('leaving.pool', bare(203), {status: 'Unbinding', expiresAt: HEAD + 250_000, provider: 'AuthorityDeposit', deposit: U128_MAX, grantedBlock: HEAD - 5_000, grantedAt: at(HEAD - 5_000)}),
    username('legacy.dot', bare(204), {provider: 'System', grantedBlock: HEAD - 6_000, grantedAt: at(HEAD - 6_000)}),
    username(`${'w'.repeat(27)}.numen`, bare(205), {grantedBlock: HEAD - 7_000, grantedAt: at(HEAD - 7_000)}),
]

export const authority = (suffix: string, account: object, traits: object = {}) => ({
    id: suffix,
    account,
    allocation: 47,
    usernameCount: 3,
    addedBlock: HEAD - 20_000,
    addedAt: at(HEAD - 20_000),
    ...traits,
})

// a suffix the chain started with has no AuthorityAdded behind it
export const EVERY_AUTHORITY = [
    authority('genesis', bare(210), {addedBlock: null, addedAt: null}),
    authority('numen', NAMED_OWNER),
    authority('spent', bare(211), {allocation: 0, usernameCount: 0}),
    authority('maxed', person(1), {allocation: INT_MAX, usernameCount: INT_MAX}),
]
