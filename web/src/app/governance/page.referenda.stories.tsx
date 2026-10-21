import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import data, {referenda, referendaCount} from '../../../../mock/data.js'
import {chainInfo, HEAD, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {proposal} from '../../../../mock/fixtures/governance.js'
import {all, expectFits, expectNoHangingDots, expectTimesFit, filterOptions, type Play} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Referenda', ...pageMeta(GovernancePage)}

const referendaTab = (rows: object[]) => pageStory({...data, referendums: rows, referendumsConnection: referendaCount(rows)}, {searchParams: {tab: 'referenda'}})

const TRACKS = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']

export const Empty: StoryObj = {
    ...referendaTab([]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No referenda yet.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All]', ...TRACKS])
    },
}

export const One = referendaTab(referenda.slice(0, 1))

const overlap = (a: Element, b: Element) => {
    const [r, s] = [a.getBoundingClientRect(), b.getBoundingClientRect()]
    return r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom
}

// the title row fits, below sm a title it would cut short gets the line to
// itself, the status keeps clear of the facts, no line ends on a middle dot and
// the submission time breaks inside the card
const referendumCardsFit: Play = async ({canvasElement}) => {
    const cards = [...canvasElement.querySelectorAll('a[href^="/referendum/"]')].map(title => title.closest('[data-slot=card]')!)
    const heads = cards.map(card => card.firstElementChild!)
    expectFits(...heads)
    const narrow = matchMedia('(width < 40rem)').matches
    for (const head of heads) {
        const title = head.querySelector('a')!
        if (narrow && title.scrollWidth > title.clientWidth) expect(head.lastElementChild!.getBoundingClientRect().top).toBeGreaterThanOrEqual(title.getBoundingClientRect().bottom)
    }
    for (const byline of cards.map(card => card.querySelector('[data-slot=separator] + div')!)) {
        for (const fact of byline.firstElementChild!.children) expect(overlap(fact, byline.lastElementChild!)).toBe(false)
    }
    expectNoHangingDots(canvasElement)
    expectTimesFit(canvasElement)
}

const tranche = (amount: number) => ({__kind: 'Treasury', value: {__kind: 'spend', assetKind: null, amount: numn(amount), beneficiary: PEOPLE[0].id, validFrom: null}})
const staged = {...referenda[5], id: '13', index: 13, title: 'Staged grant paid out in four tranches', ...proposal({__kind: 'Utility', value: {__kind: 'batch_all', calls: [200_000, 150_000, 120_000, 80_000].map(tranche)}})}
const unsigned = {...referenda[6], id: '22', index: 22, submitter: null, description: 'Pays three community teams for six months of translation work.'}

const PHASES = ['Approved', 'Cancelled', 'Confirming', 'Deciding', 'Killed', 'Rejected', 'Submitted', 'Timed out']

// every phase the curated referenda run through, a grant staged over four
// spends counting its payouts after the total, a description behind its icon
// and a byline with no submitter on record
export const EveryCase: StoryObj = {
    ...referendaTab([unsigned, staged, ...referenda]),
    play: all(async ({canvas, canvasElement}) => {
        const bylines = [...canvasElement.querySelectorAll('a[href^="/referendum/"]')].map(title => title.closest('[data-slot=card]')!.querySelector('[data-slot=separator] + div')!)
        expect([...new Set(bylines.map(byline => byline.lastElementChild!.textContent!))].sort()).toEqual(PHASES)
        await expect(canvas.getByText('· 4 payouts')).toBeVisible()
        expect(canvasElement.querySelectorAll('.lucide-file-text')).toHaveLength(1)
        expect(bylines.filter(byline => byline.firstElementChild!.firstElementChild!.textContent === '—')).toHaveLength(1)
    }, referendumCardsFit),
}

export const Many = referendaTab(Array.from({length: 40}, (_, i) => ({...referenda[i % referenda.length], id: String(i), index: i})))

const DECIDING = referenda.find(r => r.index === 5)!

// a quarter into its decision period at the newest indexed block while the
// chain has run past the whole period, the thresholds read a quarter in
export const IndexBehind: StoryObj = {
    ...pageStory(
        {...data, chainInfos: [{...chainInfo, head: HEAD + 300_000, finalizedHead: HEAD + 299_998}], referendums: [{...DECIDING, decidingSince: HEAD - 60_480}], referendumsConnection: referendaCount([DECIDING])},
        {searchParams: {tab: 'referenda'}}
    ),
    play: async ({canvasElement}) => {
        const needs = [...canvasElement.querySelectorAll('span')].filter(el => el.children.length === 0 && el.textContent!.startsWith(' need ')).map(el => el.textContent!.trim())
        await expect(needs).toEqual(['need 87.50%', 'need 3.19%'])
    },
}

// a proposal just short of ten billion whole tokens, a tally ending on the last
// digits shown and an approval a few nays short of all
export const TruncationEdges: StoryObj = {
    ...referendaTab([{...referenda[6], proposalAmount: '9999999999999999999999999999', ayes: numn(1_150_000), nays: numn(4.35), support: numn(8_200_000)}]),
    play: all(async ({canvas}) => {
        await expect(canvas.getByText('9,999,999,999')).toBeInTheDocument()
        for (const figure of ['aye 1.15M', 'nay 4.35', 'voted 8.2M', '99.99%', '15.61%']) await expect(canvas.getByText(figure).textContent).toBe(figure)
    }, referendumCardsFit),
}

// the longest display name and a title short enough to keep its call on the same line
export const LongNameShortTitle: StoryObj = {
    ...referendaTab([
        {...referenda[7], id: '21', index: 21, submitter: PEOPLE[7]},
        {...referenda[2], id: '20', index: 20, title: 'Hello', description: 'A remark to test the waters.'},
    ]),
    play: async context => {
        await referendumCardsFit(context)
        const head = context.canvas.getByText('Hello').closest('a')!.parentElement!.parentElement!
        await expect(head.lastElementChild!.getBoundingClientRect().top).toBeLessThan(head.querySelector('a')!.getBoundingClientRect().bottom)
    },
}

interface ReferendaWhere {
    where?: {status_eq?: string; track?: {id_eq: string}}
}

const onTrack = ({where}: ReferendaWhere) => referenda.filter(r => (!where?.track || r.track.id === where.track.id_eq) && (!where?.status_eq || r.status === where.status_eq))

const trackFilter = (id: string) =>
    pageStory({...data, referendums: onTrack, referendumsConnection: (args: ReferendaWhere) => ({totalCount: onTrack(args).length})}, {searchParams: {tab: 'referenda', track: id}})

export const TrackFilter = trackFilter('31')

export const TrackFilterEmpty: StoryObj = {
    ...trackFilter('0'),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching referenda.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['All', '[Root]', ...TRACKS.slice(1)])
    },
}
