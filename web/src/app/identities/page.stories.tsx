import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor, within} from 'storybook/test'
import {acct, at, chainInfo, hashOf, HEAD, identity, numn, paged, person, subOf} from '../../../../mock/fixtures.js'
import {shortAddr} from '@/components/AddressText'
import {approxParts} from '@/lib/format'
import {BAD_JUDGEMENTS, GOOD_JUDGEMENTS} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {delegateHref} from '@/components/IdentityCards'
import {WALLET_URL} from '@/lib/wallet'
import {AVATAR_HOST, avatars} from '../../../.storybook/avatar'
import {lastPage, pageMeta, pageStory} from '../../../.storybook/page'
import IdentitiesPage from './page'

export default {title: 'Pages/Identities', ...pageMeta(IdentitiesPage)}

type Fields = {judgements?: string[]} & Partial<Record<'avatar' | 'bio' | 'web' | 'email' | 'github' | 'matrix' | 'x' | 'telegram' | 'discord', string>>

interface Row {
    id: string
    identityDisplay?: string | null
    identityJson: unknown
    username?: string
    subs?: {id: string}[]
}

const WIDEST = 'W'.repeat(32)
const U128_MAX = (2n ** 128n - 1n).toString()
const INT_MAX = 2 ** 31 - 1
const KINDS = ['KnownGood', 'Reasonable', 'FeePaid', 'Unknown', 'OutOfDate', 'LowQuality', 'Erroneous']

const registered = (n: number, display: string, fields: Fields = {}): Row => acct(n, identity(display, fields))

const nameless = (n: number, fields: Fields): Row => acct(n, identity(null, fields))

const withSubs = (parent: Row, seed: string, names: (string | null)[]): Row => ({...parent, subs: names.map((name, i) => ({id: hashOf('sub', seed, i), ...subOf(parent, name)}))})

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

const MANY = NAMES.map((name, i) => {
    const row = registered(30 + i, name, {judgements: [KINDS[i % KINDS.length]], ...CHANNEL_SETS[i % CHANNEL_SETS.length]})
    return i % 6 ? {...row, subs: []} : withSubs(row, name, ['payouts', 'ops'])
})

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
    withSubs(registered(90, 'Hundred Subs Collective'), 'hundred', Array.from({length: 100}, (_, i) => `miner-${String(i + 1).padStart(3, '0')}`)),
    withSubs(registered(91, 'Orbit Labs'), 'orbit', ['validator']),
    withSubs(registered(92, 'Polaris Guild', {judgements: ['KnownGood']}), 'polaris', ['payouts', 'treasury desk', null]),
    registered(93, 'Solo'),
]

const LONG_NAMES = [
    registered(100, 'Rocket Pool 🚀🚀🚀', {judgements: ['FeePaid'], web: 'rocket.example'}),
    withSubs(registered(101, WIDEST, {judgements: ['KnownGood', 'Erroneous'], web: `${'w'.repeat(60)}.org`, x: 'w'.repeat(31)}), 'widest', [WIDEST]),
    registered(102, 'the-longest-display-name-allowed', {judgements: ['OutOfDate']}),
    registered(103, 'Numen Foundation Validator Node', {discord: 'numenfoundation'}),
]

const WITHOUT_DISPLAY = [
    registered(110, 'Named and known good', {judgements: ['KnownGood']}),
    withSubs(nameless(111, {judgements: ['KnownGood'], x: '@anon_validator', telegram: '@anon_validator', discord: 'anon_validator'}), 'anon', ['payouts']),
    nameless(112, {judgements: ['Erroneous'], web: 'anon.example'}),
    nameless(113, {judgements: []}),
    {...nameless(114, {judgements: ['Reasonable'], discord: 'anon_operator'}), username: 'anon.numen'},
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

interface DelegateRow {
    id: string
    delegators: number
    delegated: string
}

const identities = (rows: Row[], {counts = countsOf(rows), registrars = REGISTRARS as Registrar[], tab = 'identities', page = '1', delegates = [] as DelegateRow[]} = {}) =>
    pageStory(
        {
            accounts: paged(rows),
            delegates,
            accountsConnection: tallies(counts),
            registrars: registrarRows(registrars),
            registrarsConnection: ({where}: {where?: {retiredAt_isNull?: boolean}}) => ({totalCount: where?.retiredAt_isNull === false ? registrars.filter(r => r.retiredAt != null).length : registrars.length}),
        },
        {searchParams: {tab, page}, msw: [avatars]}
    )

const registrarsTab = (registrars: Registrar[], page = '1') => identities(EVERY_VERDICT, {registrars, tab: 'registrars', page})

// the sub list opens in a popover portalled out of the canvas
const openSubs: StoryObj['play'] = async ({canvas, userEvent}) => {
    await userEvent.click((await canvas.findAllByRole('button', {name: /sub identities$/}))[0])
    await screen.findByRole('dialog')
}

export const IdentitiesEmpty = identities([], {registrars: []})

export const IdentitiesOne = identities([person(0)])

export const IdentitiesEveryVerdict = identities(EVERY_VERDICT)

export const IdentitiesChannels: StoryObj = {
    ...identities(CHANNELS),
    play: async ({canvas}) => {
        const card = (await canvas.findByText('All channels')).closest<HTMLElement>('[data-slot=card]')!
        const sizes = [...card.querySelectorAll('[aria-label]:not(button):has(> svg)')].map(m => [m.getAttribute('aria-label'), m.querySelector('svg')!.getBoundingClientRect().width])
        expect(sizes).toEqual([
            ['Web', 18],
            ['Email', 18],
            ['GitHub', 18],
            ['Matrix', 18],
            ['X', 16],
            ['Telegram', 18],
            ['Discord', 18],
        ])
    },
}

// the popover grows to its longest name, cutting names short only once it
// fills the 32rem cap or the room the viewport leaves
export const IdentitiesSubsOpen: StoryObj = {
    ...identities(WITH_SUBS),
    play: async ctx => {
        await openSubs!(ctx)
        const dialog = await screen.findByRole('dialog')
        const names = [...dialog.querySelectorAll<HTMLElement>('a[href^="/account/"] .truncate')]
        expect(names).toHaveLength(100)
        const room = Math.min(32 * parseFloat(getComputedStyle(document.documentElement).fontSize), parseFloat(getComputedStyle(dialog).getPropertyValue('--radix-popover-content-available-width')))
        const full = dialog.offsetWidth >= room - 1
        expect(full || names.every(n => n.scrollWidth <= n.clientWidth)).toBe(true)
    },
}

export const IdentitiesLongNames: StoryObj = {...identities(LONG_NAMES), play: openSubs}

const short = (row: {id: string}) => shortAddr(ss58Encode(row.id, chainInfo.ss58))

// an identity with no display still shows its judgement, beside its username or else its address
export const IdentitiesWithoutDisplay: StoryObj = {
    ...identities(WITHOUT_DISPLAY),
    play: async ctx => {
        const marks = (root: HTMLElement) =>
            [...root.querySelectorAll<HTMLElement>('a[href^="/account/"]')].map(l => [l.textContent, [...(l.querySelector('svg')?.classList ?? [])].find(c => c.startsWith('lucide-')) ?? null])
        const [, anon, spam, unjudged] = WITHOUT_DISPLAY
        expect(marks(ctx.canvasElement)).toEqual([
            ['Named and known good', 'lucide-circle-check'],
            [short(anon), 'lucide-circle-check'],
            [short(spam), 'lucide-circle-x'],
            [short(unjudged), 'lucide-circle-question-mark'],
            ['anon.numen', 'lucide-circle-check'],
        ])
        await openSubs!(ctx)
        expect(marks(await screen.findByRole('dialog'))).toEqual([[short(anon.subs![0]), 'lucide-circle-check']])
    },
}

const pictured = (n: number, display: string, avatar: string) => registered(n, display, {avatar})

const AVATARS = [
    pictured(120, 'Pictured', `${AVATAR_HOST}/pictured.png`),
    pictured(121, 'Dead link', `${AVATAR_HOST}/missing.png`),
    pictured(122, 'Plain http', 'http://avatar.example/plain.png'),
    registered(123, 'no picture'),
    nameless(125, {}),
]

// a picture that loads shows, any other avatar falls back to the first letter of the label
export const IdentitiesAvatars: StoryObj = {
    ...identities(AVATARS),
    play: async ({canvasElement}) => {
        const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].slice(-AVATARS.length)
        const faces = () => cards.map(c => c.querySelector('img')?.getAttribute('src') ?? c.querySelector('[aria-hidden].rounded-full')?.textContent)
        await waitFor(() =>
            expect(faces()).toEqual([
            `${AVATAR_HOST}/pictured.png`,
            'D',
            'P',
            'N',
            ss58Encode(AVATARS.at(-1)!.id, chainInfo.ss58)[0].toUpperCase(),
            ])
        )
    },
}

const LONG_BIO = 'I vote on every treasury referendum and publish my reasoning before the decision period ends. '.repeat(20).trim()

const BIOS = [
    registered(130, 'Short bio', {bio: 'Validator operator since genesis.'}),
    registered(131, 'Long bio', {bio: LONG_BIO}),
    registered(132, 'Lines', {bio: 'Root and Treasurer tracks\nVotes within a day\nNo split votes\nAsk on Discord'}),
    registered(133, 'Full bio only', {bio: '\nVotes within a day'}),
    registered(136, 'Markdown', {bio: 'Treasury-minded validator\n## Votes\n- **Root** and Treasurer tracks\n- reasoning on [the forum](https://forum.example.com/u/markdown)'}),
    registered(134, 'Unbroken', {bio: 'x'.repeat(2048)}),
    registered(135, 'No bio', {discord: 'nobio'}),
]

const cardOf = (canvasElement: HTMLElement, name: string) =>
    [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].find(c => c.querySelector('a[href^="/account/"]')?.textContent === name)!

// every card hands its own address to the wallet's Delegate and offers it to
// copy, shows the first line of its bio on one line, and opens the rest
export const IdentitiesBios: StoryObj = {
    ...identities(BIOS),
    play: async ({canvas, canvasElement}) => {
        expect((await canvas.findAllByRole('link', {name: 'Delegate'})).map(a => a.getAttribute('href'))).toEqual(BIOS.map(r => delegateHref(WALLET_URL, ss58Encode(r.id, chainInfo.ss58))))
        expect(canvas.getAllByRole('button', {name: 'copy'})).toHaveLength(BIOS.length)
        const names = BIOS.map(r => r.identityDisplay!)
        expect(names.filter(n => cardOf(canvasElement, n).querySelector('button[aria-label=Bio]'))).toEqual(['Lines', 'Full bio only', 'Markdown'])
        const shorts = names.map(n => cardOf(canvasElement, n).querySelector('p')!)
        expect(shorts.map(p => p.textContent)).toEqual(['Validator operator since genesis.', LONG_BIO, 'Root and Treasurer tracks', '', 'Treasury-minded validator', 'x'.repeat(2048), ''])
        for (const p of shorts.filter(p => p.textContent)) expect(p.getBoundingClientRect().height).toBeLessThanOrEqual(parseFloat(getComputedStyle(p).lineHeight))
    },
}

const openBio = async (canvasElement: HTMLElement, name: string) => {
    cardOf(canvasElement, name).querySelector<HTMLButtonElement>('button[aria-label=Bio]')!.click()
    return screen.findByRole('dialog')
}

// the dialog leads with the short bio and carries the full one below it
export const IdentitiesBioOpen: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = await openBio(canvasElement, 'Lines')
        expect(dialog.querySelector('p[dir=auto]')!.textContent).toBe('Root and Treasurer tracks')
        expect(dialog.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day\nNo split votes\nAsk on Discord')
    },
}

// a bio with no first line opens on the full bio alone
export const IdentitiesBioOpenFullOnly: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = await openBio(canvasElement, 'Full bio only')
        expect(dialog.querySelector('p[dir=auto]')).toBeNull()
        expect(dialog.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day')
    },
}

// the full bio reads as markdown, the short bio stays plain text
export const IdentitiesBioOpenMarkdown: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = within(await openBio(canvasElement, 'Markdown'))
        expect(dialog.getByRole('heading', {level: 2, name: 'Votes'})).toBeInTheDocument()
        expect(dialog.getByText('Root').tagName).toBe('STRONG')
        expect(dialog.getByRole('link', {name: 'the forum'})).toHaveAttribute('href', 'https://forum.example.com/u/markdown')
    },
}

// every script outside English lives here and only here. displays stay within
// the 32 bytes the chain takes, the last bio fills its 2048
const LANGUAGES = [
    registered(150, '数值网络官方验证节点', {discord: '数值网络', bio: '我们运行主网验证节点，并在每一次国库公投前公开投票理由。'}),
    registered(151, 'ヌーメン検証者', {bio: 'メインネットのバリデーターを運営し、すべての国庫提案に投票します。'}),
    registered(152, '누멘 검증인', {bio: '메인넷 검증인을 운영하며 모든 재무 국민투표에 투표합니다.'}),
    registered(153, 'مدقق نومن', {bio: 'نشغّل مدقق الشبكة الرئيسية.\nونصوّت على كل استفتاء للخزينة.'}),
    registered(154, 'מאמת נומן', {bio: 'אנחנו מפעילים מאמת ברשת הראשית ומצביעים בכל משאל עם של האוצר.'}),
    registered(155, 'Валидатор Нумен', {bio: 'Мы управляем валидатором основной сети и голосуем по каждому референдуму казначейства.'}),
    registered(156, 'นูเมน', {bio: 'เราดูแลโหนดตรวจสอบบนเครือข่ายหลักและลงคะแนนในการลงประชามติคลังทุกครั้งโดยไม่เว้นวรรคระหว่างคำเลย'}),
    registered(157, 'नूमेन', {bio: 'हम मुख्य नेटवर्क पर सत्यापनकर्ता चलाते हैं और हर कोष जनमत संग्रह में मतदान करते हैं।'}),
    registered(158, '🇨🇳 Flag first', {bio: '🇨🇳🇯🇵🇰🇷 flags and 👩‍💻 joined emoji in a bio'}),
    registered(159, '👩‍💻 Coder', {bio: '👩‍💻'.repeat(40)}),
    registered(160, '全宽', {bio: '链'.repeat(682)}),
]

// the monogram takes the first whole grapheme, a right to left bio runs right to
// left, and no short bio passes one line or pushes its card wider
export const IdentitiesLanguages: StoryObj = {
    ...identities(LANGUAGES),
    play: async ({canvasElement}) => {
        const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].slice(-LANGUAGES.length)
        expect(cards.map(c => c.querySelector('[aria-hidden].rounded-full')?.textContent)).toEqual(['数', 'ヌ', '누', 'م', 'מ', 'В', 'นู', 'नू', '🇨🇳', '👩‍💻', '全'])
        const bios = cards.map(c => c.querySelector('p')!)
        expect(bios.map(p => p.matches(':dir(rtl)'))).toEqual(LANGUAGES.map((_, i) => i === 3 || i === 4))
        for (const p of bios) expect(p.getBoundingClientRect().height).toBeLessThanOrEqual(parseFloat(getComputedStyle(p).lineHeight))
        for (const c of cards) expect(c.scrollWidth).toBeLessThanOrEqual(c.clientWidth)
        const dialog = await openBio(canvasElement, 'مدقق نومن')
        expect(dialog.querySelector('p[dir=auto]')!.matches(':dir(rtl)')).toBe(true)
    },
}

const DELEGATES = [registered(140, 'Delegate', {bio: 'Delegate to me on any track.'}), registered(141, 'Undelegated'), registered(142, 'Whale')]

const DELEGATE_ROWS: DelegateRow[] = [
    {id: DELEGATES[0].id, delegators: 3, delegated: numn(1_534.5678)},
    {id: DELEGATES[2].id, delegators: 1, delegated: U128_MAX},
]

export const IdentitiesDelegations: StoryObj = {
    ...identities(DELEGATES, {delegates: DELEGATE_ROWS}),
    play: async ({canvasElement}) => {
        const figures = (planck: string) => {
            const {exact, figure} = approxParts(planck, chainInfo.decimals, chainInfo.symbol)
            return `${exact ? '' : '≈'}${figure}`
        }
        const stats = [...canvasElement.querySelectorAll('dl')].map(dl => [...dl.querySelectorAll('dd')].slice(0, 2).map(dd => dd.textContent))
        expect(stats).toEqual([
            ['3', figures(numn(1_534.5678))],
            ['0', figures('0')],
            ['1', figures(U128_MAX)],
        ])
    },
}

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
