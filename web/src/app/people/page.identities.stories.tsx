import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor, within} from 'storybook/test'
import {acct, chainInfo, identity, numn, person} from '../../../../mock/fixtures.js'
import {approxParts} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import {delegateHref} from '@/components/IdentityCards'
import {WALLET_URL} from '@/lib/wallet'
import {AVATAR_HOST} from '../../../.storybook/avatar'
import {lastPage, pageMeta} from '../../../.storybook/page'
import PeoplePage from './page'
import {Fields, Row, U128_MAX, registered, withSubs, MANY, WITH_SUBS, identities, short} from './page.stories.helpers'

export default {title: 'Pages/People/Identities', ...pageMeta(PeoplePage)}

const WIDEST = 'W'.repeat(32)

const nameless = (n: number, fields: Fields): Row => acct(n, identity(null, fields))

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

// the sub list opens in a popover portalled out of the canvas
const openSubs: StoryObj['play'] = async ({canvas, userEvent}) => {
    await userEvent.click((await canvas.findAllByRole('button', {name: /sub identities$/}))[0])
    await screen.findByRole('dialog')
}

// the popover grows to its longest name, cutting names short only once it
// fills the 32rem cap or the room the viewport leaves
function expectSubsFit(dialog: HTMLElement, count: number) {
    const names = [...dialog.querySelectorAll<HTMLElement>('a[href^="/account/"] .truncate')]
    expect(names).toHaveLength(count)
    const room = Math.min(32 * parseFloat(getComputedStyle(document.documentElement).fontSize), parseFloat(getComputedStyle(dialog).getPropertyValue('--radix-popover-content-available-width')))
    const full = dialog.offsetWidth >= room - 1
    expect(full || names.every(n => n.scrollWidth <= n.clientWidth)).toBe(true)
}

// the identity cards a story renders, past the tiles above them
const cardsOf = (canvasElement: HTMLElement, rows: Row[]) => [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].slice(-rows.length)

export const Empty = identities([], {registrars: []})

export const One = identities([person(0)])

// each card shows a mark for every channel its identity fills in and none for the rest
export const ChannelSets: StoryObj = {
    ...identities(CHANNELS),
    play: async ({canvasElement}) => expect(cardsOf(canvasElement, CHANNELS).map(card => card.querySelectorAll('[aria-label]:not(button):has(> svg)').length)).toEqual([7, 1, 0, 2, 2]),
}

export const SubsOpen: StoryObj = {
    ...identities(WITH_SUBS),
    play: async ctx => {
        await openSubs!(ctx)
        expectSubsFit(await screen.findByRole('dialog'), 100)
    },
}

// long names cut short inside their cards, and the widest sub name sizes its popover
export const LongNamesSubsOpen: StoryObj = {
    ...identities(LONG_NAMES),
    play: async ctx => {
        for (const card of cardsOf(ctx.canvasElement, LONG_NAMES)) expect(card.scrollWidth).toBeLessThanOrEqual(card.clientWidth)
        await openSubs!(ctx)
        expectSubsFit(await screen.findByRole('dialog'), 1)
    },
}

// an identity with no display still shows its judgement, beside its username or else its address
export const WithoutDisplay: StoryObj = {
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

// a picture that loads shows with the identicon in its badge, any other avatar leaves the identicon alone
export const Avatars: StoryObj = {
    ...identities(AVATARS),
    play: async ({canvasElement}) => {
        const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].slice(-AVATARS.length)
        const faces = () => cards.map(c => c.querySelector('button img')?.getAttribute('src') ?? (c.querySelector('[aria-hidden] > svg') ? 'identicon' : null))
        await waitFor(() => expect(faces()).toEqual([`${AVATAR_HOST}/pictured.png`, 'identicon', 'identicon', 'identicon', 'identicon']))
    },
}

const LONG_BIO = 'I vote on every treasury referendum and publish my reasoning before the decision period ends. '.repeat(20).trim()

const BIOS = [
    registered(130, 'Short bio', {bio: 'Validator operator since genesis.'}),
    registered(131, 'Long bio', {bio: LONG_BIO}),
    registered(132, 'Lines', {bio: 'Root and Treasurer tracks\nVotes within a day\nNo split votes\nAsk on Discord'}),
    registered(133, 'Full bio only', {bio: '\nVotes within a day'}),
    registered(136, 'Markdown', {bio: 'Treasury-minded validator\n## Votes\n- **Root** and Treasurer tracks\n- reasoning on [the forum](https://forum.example.com/u/markdown)', web: 'markdown.example.com'}),
    registered(134, 'Unbroken', {bio: 'x'.repeat(2048)}),
    registered(135, 'No bio', {discord: 'nobio'}),
]

const cardOf = (canvasElement: HTMLElement, name: string) =>
    [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].find(c => c.querySelector('a[href^="/account/"]')?.textContent === name)!

// a card shows the first line of its bio on one line and a button that opens its detail
export const Bios: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const names = BIOS.map(r => r.identityDisplay!)
        expect(names.filter(n => cardOf(canvasElement, n).querySelector('button[aria-label=Bio]'))).toEqual(names)
        const shorts = names.map(n => cardOf(canvasElement, n).querySelector('p')!)
        expect(shorts.map(p => p.textContent)).toEqual(['Validator operator since genesis.', LONG_BIO, 'Root and Treasurer tracks', '', 'Treasury-minded validator', 'x'.repeat(2048), ''])
        for (const p of shorts.filter(p => p.textContent)) expect(p.getBoundingClientRect().height).toBeLessThanOrEqual(parseFloat(getComputedStyle(p).lineHeight))
    },
}

// every card hands its own address to the wallet's Delegate and offers it to
// copy, beside the name or, with no name, beside the address that stands in for it
const ACTIONS = [registered(170, 'Named'), nameless(171, {})]

export const CardActions: StoryObj = {
    ...identities(ACTIONS),
    play: async ({canvas, canvasElement}) => {
        expect((await canvas.findAllByRole('link', {name: 'Delegate'})).map(a => a.getAttribute('href'))).toEqual(ACTIONS.map(r => delegateHref(WALLET_URL, ss58Encode(r.id, chainInfo.ss58))))
        expect(cardsOf(canvasElement, ACTIONS).map(card => within(card).getAllByRole('button', {name: 'copy'}).length)).toEqual([1, 1])
    },
}

const openBio = async (canvasElement: HTMLElement, name: string) => {
    cardOf(canvasElement, name).querySelector<HTMLButtonElement>('button[aria-label=Bio]')!.click()
    return screen.findByRole('dialog')
}

// the dialog's close button sits level with its title, and the dialog leads
// with the short bio and carries the full one below it
export const BioOpen: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = await openBio(canvasElement, 'Lines')
        const mid = (el: Element) => {
            const r = el.getBoundingClientRect()
            return r.top + r.height / 2
        }
        expect(mid(within(dialog).getByRole('button', {name: 'Close'}))).toBeCloseTo(mid(within(dialog).getByRole('heading', {name: 'Detail'})), 0)
        expect(within(dialog).getByText('Lines')).toBeInTheDocument()
        expect(dialog.querySelector('p[dir=auto]')!.textContent).toBe('Root and Treasurer tracks')
        expect(dialog.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day\nNo split votes\nAsk on Discord')
    },
}

// a bio with no first line opens on the full bio alone
export const BioOpenFullOnly: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = await openBio(canvasElement, 'Full bio only')
        expect(dialog.querySelector('p[dir=auto]')).toBeNull()
        expect(dialog.querySelector<HTMLElement>('.prose')!.innerText).toBe('Votes within a day')
    },
}

// the full bio reads as markdown under the socials, the short bio stays plain text
export const BioOpenMarkdown: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = within(await openBio(canvasElement, 'Markdown'))
        expect(dialog.getByRole('heading', {level: 2, name: 'Votes'})).toBeInTheDocument()
        expect(dialog.getByText('Root').tagName).toBe('STRONG')
        expect(dialog.getByRole('link', {name: 'the forum'})).toHaveAttribute('href', 'https://forum.example.com/u/markdown')
        expect(dialog.getByRole('link', {name: 'Web'})).toHaveAttribute('href', 'https://markdown.example.com/')
    },
}

// with no bio the dialog keeps the face, name and socials
export const BioOpenNoBio: StoryObj = {
    ...identities(BIOS),
    play: async ({canvasElement}) => {
        const dialog = await openBio(canvasElement, 'No bio')
        expect(within(dialog).getByText('No bio')).toBeInTheDocument()
        expect(within(dialog).getByLabelText('Discord')).toBeInTheDocument()
        expect(dialog.querySelector('p[dir=auto]')).toBeNull()
        expect(dialog.querySelector('.prose')).toBeNull()
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

// a right to left bio runs right to left, and no short bio passes one line or
// pushes its card wider
export const Languages: StoryObj = {
    ...identities(LANGUAGES),
    play: async ({canvasElement}) => {
        const cards = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card]')].slice(-LANGUAGES.length)
        const bios = cards.map(c => c.querySelector('p')!)
        expect(bios.map(p => p.matches(':dir(rtl)'))).toEqual(LANGUAGES.map((_, i) => i === 3 || i === 4))
        for (const p of bios) expect(p.getBoundingClientRect().height).toBeLessThanOrEqual(parseFloat(getComputedStyle(p).lineHeight))
        for (const c of cards) expect(c.scrollWidth).toBeLessThanOrEqual(c.clientWidth)
        const dialog = await openBio(canvasElement, 'مدقق نومن')
        expect(dialog.querySelector('p[dir=auto]')!.matches(':dir(rtl)')).toBe(true)
    },
}

const DELEGATES = [
    {...registered(140, 'Delegate', {bio: 'Delegate to me on any track.'}), delegate: {delegators: 3, delegated: numn(1_534.5678)}},
    {...registered(141, 'Undelegated'), delegate: null},
    {...registered(142, 'Whale'), delegate: {delegators: 1, delegated: U128_MAX}},
]

export const Delegations: StoryObj = {
    ...identities(DELEGATES),
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

export const Many = identities(MANY)

export const Page2 = identities(MANY, {page: '2'})

export const LastPage = identities(MANY, {page: lastPage(MANY.length)})
