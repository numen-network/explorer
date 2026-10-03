import type {StoryObj} from '@storybook/nextjs-vite'
import {acct, at, hashOf, HEAD, identity, numn, person} from '../../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
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

const SWEEP = Array.from({length: 10_000}, (_, i): Row => MANY[i] ?? {id: hashOf('identity', i), identityJson: {judgements: [[0, {__kind: KINDS[i % KINDS.length]}]]}})

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

// the tallies sweep every registration while the table asks for its first page
const identitiesTab = (all: Row[], {subs = subCount(all), registrars = REGISTRARS} = {}) =>
    pageStory({accounts: ({limit}: {limit: number}) => all.slice(0, limit), accountsConnection: {totalCount: subs}, registrars})

const registrarsTab = (registrars: object[]) => pageStory({accounts: EVERY_VERDICT, registrars}, {searchParams: {tab: 'registrars'}})

const expandAll: StoryObj['play'] = async ({canvas, userEvent}) => {
    for (const button of await canvas.findAllByRole('button', {name: 'expand'})) await userEvent.click(button)
}

export const IdentitiesEmpty = identitiesTab([], {registrars: []})

export const IdentitiesOne = identitiesTab([person(0)])

export const IdentitiesEveryVerdict = identitiesTab(EVERY_VERDICT)

export const IdentitiesChannels = identitiesTab(CHANNELS)

export const IdentitiesSubsExpanded: StoryObj = {...identitiesTab(WITH_SUBS), play: expandAll}

export const IdentitiesLongNames: StoryObj = {...identitiesTab(LONG_NAMES), play: expandAll}

export const IdentitiesWithoutDisplay = identitiesTab(WITHOUT_DISPLAY)

export const IdentitiesMany = identitiesTab(MANY)

export const IdentitiesExtremeCounts = identitiesTab(SWEEP, {subs: 1_000_000})

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

export const RegistrarsMany = registrarsTab(Array.from({length: 24}, (_, i) => (i % 5 === 3 ? retired(i, HEAD - 200_000 + i * 1_000) : registrar(i))))
