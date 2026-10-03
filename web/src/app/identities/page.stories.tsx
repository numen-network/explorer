import type {StoryObj} from '@storybook/nextjs-vite'
import {acct, at, hashOf, HEAD, identity, numn, paged, person} from '../../../../mock/fixtures.js'
import {BAD_JUDGEMENTS, GOOD_JUDGEMENTS} from '@/lib/identity'
import {lastPage, pageMeta, pageStory} from '../../../.storybook/page'
import IdentitiesPage from './page'

export default {title: 'Pages/Identities', ...pageMeta(IdentitiesPage)}

type Fields = {judgements?: string[]} & Partial<Record<'avatar' | 'bio' | 'web' | 'email' | 'github' | 'matrix' | 'x' | 'telegram' | 'discord', string>>

interface Row {
    id: string
    identityDisplay?: string | null
    identityJson: unknown
    subs?: unknown[]
}

const WIDEST = 'W'.repeat(32)
const U128_MAX = (2n ** 128n - 1n).toString()
const INT_MAX = 2 ** 31 - 1
const KINDS = ['KnownGood', 'Reasonable', 'FeePaid', 'Unknown', 'OutOfDate', 'LowQuality', 'Erroneous']

const registered = (n: number, display: string, fields: Fields = {}): Row => acct(n, identity(display, fields))

const nameless = (n: number, fields: Fields): Row => ({...registered(n, '', fields), identityDisplay: null})

const subsOf = (parent: string, names: (string | null)[]) => names.map((name, i) => ({id: hashOf('sub', parent, i), identitySubName: name}))

const registrar = (index: number, traits: object = {}) => ({
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

const retired = (index: number, retiredAt: number) => registrar(index, {account: null, fee: null, retiredAt})

const REGISTRARS = [registrar(0), registrar(1, {fee: numn(10)}), retired(2, HEAD - 86_400)]

const EVERY_VERDICT = [
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

const MANY = NAMES.map((name, i) => ({
    ...registered(30 + i, name, {judgements: [KINDS[i % KINDS.length]], ...CHANNEL_SETS[i % CHANNEL_SETS.length]}),
    subs: i % 6 ? [] : subsOf(name, ['payouts', 'ops']),
}))

const CHANNELS = [
    registered(80, 'All channels', {
        judgements: ['KnownGood'],
        avatar: 'https://polaris.example/avatar.png',
        bio: 'Independent registrar and validator operator',
        web: 'polaris.example',
        email: 'ops@polaris.example',
        github: 'polaris-guild',
        matrix: '@polaris:matrix.org',
        x: '@polaris_guild',
        telegram: '@polarisguild',
        discord: 'polarisguild',
    }),
    registered(81, 'Discord only', {discord: 'orbitlabs'}),
    registered(82, 'No channels'),
    registered(83, 'Unlinkable channels', {web: 'javascript:alert(1)', email: 'not an email'}),
    registered(84, 'Web and X', {web: 'https://orbit.example', x: 'orbit_labs'}),
]

const WITH_SUBS = [
    {...registered(90, 'Hundred Subs Collective'), subs: subsOf('hundred', Array.from({length: 100}, (_, i) => `miner-${String(i + 1).padStart(3, '0')}`))},
    {...registered(91, 'Orbit Labs'), subs: subsOf('orbit', ['validator'])},
    {...registered(92, 'Polaris Guild', {judgements: ['KnownGood']}), subs: subsOf('polaris', ['payouts', 'treasury desk', null])},
    registered(93, 'Solo'),
]

const LONG_NAMES = [
    registered(100, 'Rocket Pool 🚀🚀🚀', {judgements: ['FeePaid'], web: 'rocket.example'}),
    {...registered(101, WIDEST, {judgements: ['KnownGood', 'Erroneous'], web: `${'w'.repeat(60)}.org`, x: 'w'.repeat(31)}), subs: subsOf('widest', [WIDEST])},
    registered(102, 'the-longest-display-name-allowed', {judgements: ['OutOfDate']}),
    registered(103, '数值网络官方验证节点', {discord: '数值网络'}),
]

const WITHOUT_DISPLAY = [
    registered(110, 'Named and known good', {judgements: ['KnownGood']}),
    nameless(111, {judgements: ['KnownGood'], x: '@anon_validator', telegram: '@anon_validator', discord: 'anon_validator'}),
    nameless(112, {judgements: ['Erroneous'], web: 'anon.example'}),
    nameless(113, {judgements: []}),
]

const subCount = (rows: Row[]) => rows.reduce((n, r) => n + (r.subs?.length ?? 0), 0)

const kindsOf = (r: Row) => ((r.identityJson as {judgements?: [number, {__kind: string}][]} | null)?.judgements ?? []).map(([, j]) => j.__kind)
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

interface Registrar {
    retiredAt?: number | null
    lastJudgementBlock: number | null
}

// the latest judgement tile reads one registrar ordered by its last judgement, the tab reads a page in index order
const registrarRows = (list: Registrar[]) => (args: {orderBy: string[]; limit: number; offset: number}) =>
    args.orderBy[0] === 'lastJudgementBlock_DESC_NULLS_LAST'
        ? list.filter(r => r.lastJudgementBlock != null).sort((a, b) => b.lastJudgementBlock! - a.lastJudgementBlock!).slice(0, 1)
        : paged(list)(args)

const identities = (rows: Row[], {counts = countsOf(rows), registrars = REGISTRARS as Registrar[], tab = 'identities', page = '1'} = {}) =>
    pageStory(
        {
            accounts: paged(rows),
            accountsConnection: tallies(counts),
            registrars: registrarRows(registrars),
            registrarsConnection: ({where}: {where?: {retiredAt_isNull?: boolean}}) => ({totalCount: where?.retiredAt_isNull === false ? registrars.filter(r => r.retiredAt != null).length : registrars.length}),
        },
        {searchParams: {tab, page}}
    )

const registrarsTab = (registrars: Registrar[], page = '1') => identities(EVERY_VERDICT, {registrars, tab: 'registrars', page})

const expandAll: StoryObj['play'] = async ({canvas, userEvent}) => {
    for (const button of await canvas.findAllByRole('button', {name: 'expand'})) await userEvent.click(button)
}

export const IdentitiesEmpty = identities([], {registrars: []})

export const IdentitiesOne = identities([person(0)])

export const IdentitiesEveryVerdict = identities(EVERY_VERDICT)

export const IdentitiesChannels = identities(CHANNELS)

export const IdentitiesSubsExpanded: StoryObj = {...identities(WITH_SUBS), play: expandAll}

export const IdentitiesLongNames: StoryObj = {...identities(LONG_NAMES), play: expandAll}

export const IdentitiesWithoutDisplay = identities(WITHOUT_DISPLAY)

export const IdentitiesMany = identities(MANY)

export const IdentitiesPage2 = identities(MANY, {page: '2'})

export const IdentitiesLastPage = identities(MANY, {page: lastPage(MANY.length)})

export const IdentitiesExtremeCounts = identities(MANY, {counts: {direct: 2_147_483_647, good: 1_234_567_890, bad: 98_765_432, both: 1_234_567, subs: 1_000_000}})

export const RegistrarsEmpty = registrarsTab([])

export const RegistrarsOne = registrarsTab([registrar(0)])

export const RegistrarsEveryCase = registrarsTab([
    registrar(0),
    registrar(1, {fee: '0'}),
    registrar(2, {fee: U128_MAX}),
    registrar(3, {requestCount: 0, givenCount: 0, lastJudgementBlock: null, lastJudgementAt: null}),
    registrar(4, {requestCount: INT_MAX, givenCount: INT_MAX}),
    retired(5, HEAD - 50_000),
])

const manyRegistrars = Array.from({length: 45}, (_, i) => (i % 5 === 3 ? retired(i, HEAD - 200_000 + i * 1_000) : registrar(i)))

export const RegistrarsMany = registrarsTab(manyRegistrars)

export const RegistrarsPage2 = registrarsTab(manyRegistrars, '2')

export const RegistrarsLastPage = registrarsTab(manyRegistrars, lastPage(manyRegistrars.length))
