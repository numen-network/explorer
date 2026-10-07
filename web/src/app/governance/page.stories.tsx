import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor} from 'storybook/test'
import data, {referenda, referendaCount} from '../../../../mock/data.js'
import {HEAD, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {bounty, BOUNTY_STATUSES, counted, linear, listed, proposal, reciprocal, SPEND_STATUSES, spend, spendsInOneBlock, stepped, track} from '../../../../mock/fixtures/governance.js'
import {axesLegible, columnTexts, expectFits, expectLegibleAxes, expectNoHangingDots, expectTimesFit, filterChips, PHONE} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance', ...pageMeta(GovernancePage)}

const referendaTab = (rows: object[]) => pageStory({...data, referendums: rows, referendumsConnection: referendaCount(rows)}, {searchParams: {tab: 'referenda'}})

const TRACKS = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']

export const ReferendaEmpty: StoryObj = {
    ...referendaTab([]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No referenda yet.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Track')).toEqual(['[All]', ...TRACKS])
    },
}

export const ReferendaOne = referendaTab(referenda.slice(0, 1))

export const ReferendaEveryCase = referendaTab(referenda)

export const ReferendaMany = referendaTab(Array.from({length: 40}, (_, i) => ({...referenda[i % referenda.length], id: String(i), index: i})))

const tranche = (amount: number) => ({pallet: 'Treasury', method: 'spend', depth: 1, amount: numn(amount), beneficiary: PEOPLE[0].id, validFrom: null})

// a grant staged over four spends counts its payouts after the total
export const ReferendaStagedPayouts: StoryObj = {
    ...referendaTab([{...referenda[5], id: '13', index: 13, title: 'Staged grant paid out in four tranches', ...proposal([{pallet: 'Utility', method: 'batch_all', depth: 0}, ...[200_000, 150_000, 120_000, 80_000].map(tranche)], null)}]),
    play: async ({canvas}) => expect(canvas.getByText('· 4 payouts')).toBeVisible(),
}

// a proposal just short of ten billion whole tokens, a tally ending on the last
// digits shown and an approval a few nays short of all
export const ReferendaTruncationEdges: StoryObj = {
    ...referendaTab([{...referenda[6], proposalAmount: '9999999999999999999999999999', ayes: numn(1_150_000), nays: numn(4.35), support: numn(8_200_000)}]),
    play: async ({canvas}) => {
        await expect(canvas.getByText('9,999,999,999')).toBeInTheDocument()
        for (const figure of ['aye 1.15M', 'nay 4.35', 'voted 8.2M', '99.99%', '15.61%']) await expect(canvas.getByText(figure)).toBeInTheDocument()
    },
}

// no submitter on record, a description behind its icon, the longest display
// name and a title short enough to keep its call on the same line
export const ReferendaEdgeCases = referendaTab([
    {...referenda[6], id: '22', index: 22, submitter: null, description: 'Pays three community teams for six months of translation work.'},
    {...referenda[7], id: '21', index: 21, submitter: PEOPLE[7]},
    {...referenda[2], id: '20', index: 20, title: 'Hello', description: 'A remark to test the waters.'},
])

const overlap = (a: Element, b: Element) => {
    const [r, s] = [a.getBoundingClientRect(), b.getBoundingClientRect()]
    return r.left < s.right && s.left < r.right && r.top < s.bottom && s.top < r.bottom
}

// on a phone the title row fits, a title it would cut short gets the line to
// itself, the status keeps clear of the facts, no line ends on a middle dot
// and the submission time breaks inside the card
const fitsPhone = ({canvasElement}: {canvasElement: HTMLElement}) => {
    const cards = [...canvasElement.querySelectorAll('a[href^="/referendum/"]')].map(title => title.closest('[data-slot=card]')!)
    const heads = cards.map(card => card.firstElementChild!)
    expectFits(...heads)
    for (const head of heads) {
        const title = head.querySelector('a')!
        if (title.scrollWidth > title.clientWidth) expect(head.lastElementChild!.getBoundingClientRect().top).toBeGreaterThanOrEqual(title.getBoundingClientRect().bottom)
    }
    for (const byline of cards.map(card => card.querySelector('[data-slot=separator] + div')!)) {
        for (const fact of byline.firstElementChild!.children) expect(overlap(fact, byline.lastElementChild!)).toBe(false)
    }
    expectNoHangingDots(canvasElement)
    expectTimesFit(canvasElement)
}

export const ReferendaEveryCaseOnPhone: StoryObj = {...ReferendaEveryCase, globals: PHONE, play: fitsPhone}

export const ReferendaStagedPayoutsOnPhone: StoryObj = {
    ...ReferendaStagedPayouts,
    globals: PHONE,
    play: async context => {
        await ReferendaStagedPayouts.play!(context)
        fitsPhone(context)
    },
}

export const ReferendaTruncationEdgesOnPhone: StoryObj = {
    ...ReferendaTruncationEdges,
    globals: PHONE,
    play: async context => {
        await ReferendaTruncationEdges.play!(context)
        fitsPhone(context)
    },
}

export const ReferendaEdgeCasesOnPhone: StoryObj = {
    ...ReferendaEdgeCases,
    globals: PHONE,
    play: async context => {
        fitsPhone(context)
        const head = context.canvas.getByText('Hello').closest('a')!.parentElement!.parentElement!
        expect(head.lastElementChild!.getBoundingClientRect().top).toBeLessThan(head.querySelector('a')!.getBoundingClientRect().bottom)
    },
}

interface ReferendaWhere {
    where?: {status_eq?: string; track?: {id_eq: string}}
}

const onTrack = ({where}: ReferendaWhere) => referenda.filter(r => (!where?.track || r.track.id === where.track.id_eq) && (!where?.status_eq || r.status === where.status_eq))

const trackFilter = (id: string) =>
    pageStory({...data, referendums: onTrack, referendumsConnection: (args: ReferendaWhere) => ({totalCount: onTrack(args).length})}, {searchParams: {tab: 'referenda', track: id}})

export const ReferendaTrackFilter = trackFilter('31')

export const ReferendaTrackFilterEmpty: StoryObj = {
    ...trackFilter('0'),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching referenda.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Track')).toEqual(['All', '[Root]', ...TRACKS.slice(1)])
    },
}

const treasuryTab = (rows: object[], filters: Record<string, string> = {}) =>
    pageStory({...data, treasurySpends: listed(rows), treasurySpendsConnection: counted(rows)}, {searchParams: {tab: 'treasury', ...filters}})

const spends = Array.from({length: 47}, (_, i) => spend(i, SPEND_STATUSES[(i * 3) % SPEND_STATUSES.length]))

export const TreasuryEmpty: StoryObj = {
    ...treasuryTab([]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No spends yet.')).toBeInTheDocument()
        for (const row of ['Kind', 'Status', 'Track']) expect(filterChips(canvasElement, row)).toBeNull()
    },
}

export const TreasuryOne = treasuryTab([spend(0, 'Paid')])

export const TreasuryEveryStatus = treasuryTab(SPEND_STATUSES.map((status, i) => spend(i, status)))

export const TreasuryEdgeCases = treasuryTab([
    spend(0, 'AssetSpendApproved', {beneficiary: null}),
    spend(1, 'Awarded', {referendum: null}),
    spend(2, 'Paid', {amount: '0'}),
    spend(3, 'SpendApproved', {amount: '1'}),
    spend(4, 'SpendProcessed', {amount: '123456789012345678901234567890'}),
])

export const TreasuryMany = treasuryTab(spends)

// spends and spend_local proposals approved in turn in one block, newest first, each kind's #10 between its #11 and #9
export const TreasuryInOneBlock: StoryObj = {
    ...treasuryTab(spendsInOneBlock(HEAD - 600, [[11, 'SpendApproved'], [11, 'AssetSpendApproved'], [10, 'SpendApproved'], [10, 'AssetSpendApproved'], [9, 'SpendApproved'], [9, 'AssetSpendApproved']])),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Id')).toEqual(['#11', '#11', '#10', '#10', '#9', '#9'])
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Local', 'Spend', 'Local', 'Spend', 'Local', 'Spend'])
    },
}

export const TreasuryFiltered = treasuryTab(spends, {kind: 'spend', status: 'Paid'})

// no spend went through Root, so the Kind row is down to All
export const TreasuryFilteredEmpty: StoryObj = {
    ...treasuryTab(spends, {status: 'PaymentFailed', track: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching spends.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Kind')).toEqual(['[All]'])
        expect(filterChips(canvasElement, 'Status')).toEqual(['All', '[Payment failed 0]'])
        expect(filterChips(canvasElement, 'Track')).toEqual(['All', '[Root 0]', 'Small Spender 2', 'Medium Spender 3', 'Big Spender 2'])
    },
}

const bountiesTab = (rows: object[], filters: Record<string, string> = {}) =>
    pageStory({...data, bounties: listed(rows), bountiesConnection: counted(rows)}, {searchParams: {tab: 'bounties', ...filters}})

const bounties = Array.from({length: 45}, (_, i) => bounty(44 - i, BOUNTY_STATUSES[i % BOUNTY_STATUSES.length]))

export const BountiesEmpty: StoryObj = {
    ...bountiesTab([]),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No bounties yet.')).toBeInTheDocument()
        for (const row of ['Status', 'Track']) expect(filterChips(canvasElement, row)).toBeNull()
    },
}

export const BountiesOne = bountiesTab([bounty(0, 'Active')])

export const BountiesEveryStatus: StoryObj = {
    ...bountiesTab(BOUNTY_STATUSES.map((status, i) => bounty(BOUNTY_STATUSES.length - 1 - i, status))),
    play: async ({canvas, canvasElement}) => {
        await expect(filterChips(canvasElement, 'Status')).toContain('Bounty cancelled 1')
        await expect(canvas.getByRole('row', {name: /Bounty cancelled/})).toBeVisible()
    },
}

export const BountiesEdgeCases = bountiesTab([
    bounty(3, 'Proposed', {description: null}),
    bounty(2, 'Active', {description: 'Maintain the community archive node, the snapshot mirror and the public RPC endpoint for twelve months', referendum: null}),
    bounty(1, 'BountyRejected', {value: '0'}),
    bounty(0, 'BountyClaimed', {value: '987654321098765432109876543210'}),
])

export const BountiesMany = bountiesTab(bounties)

export const BountiesFiltered = bountiesTab(bounties, {status: 'Active', track: '30'})

// every bounty ran on a spender track, so none sits under Root
export const BountiesFilteredEmpty: StoryObj = {
    ...bountiesTab(bounties, {status: 'BountyClaimed', track: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching bounties.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Status')).toEqual(['All', '[Bounty claimed 0]'])
        expect(filterChips(canvasElement, 'Track')).toEqual(['All', '[Root 0]', 'Small Spender 1', 'Medium Spender 2', 'Big Spender 1'])
    },
}

const tracksTab = (rows: object[]): StoryObj => ({...pageStory({...data, tracks: listed(rows), tracksConnection: {totalCount: rows.length}}, {searchParams: {tab: 'tracks'}}), play: rows.length ? axesLegible : undefined})

const CURVES = [linear(5e8, 5e8, 1e9), reciprocal('222222224', '333333335', '333333332'), stepped(1e9, 5e8, 1e8, 2e8)]

export const TracksEmpty = tracksTab([])

export const TracksOne = tracksTab(data.tracks.slice(6, 7))

export const TracksEveryCurve = tracksTab([
    ...data.tracks,
    track('40', 'stepped_spender', {maxSpend: numn(50_000), minApproval: stepped(1e9, 5e8, 1e8, 2e8), minSupport: stepped(2e8, 1e7, 5e7, 2.5e8)}),
])

const extremeTracks = tracksTab([
    track('50', 'fast_track', {preparePeriod: 1, decisionPeriod: 60, confirmPeriod: 6, minEnactmentPeriod: 0, decisionDeposit: '1'}),
    track('51', 'a_track_name_long_enough_to_wrap_inside_its_card_title', {
        maxDeciding: 2_147_483_647,
        maxSpend: '340282366920938463463374607431768211455',
        decisionPeriod: 3_153_600,
        minSupport: reciprocal('1', '1', '0'),
    }),
])

// the widest values keep their separators and a period of one block hovers in the singular
export const TracksExtremes: StoryObj = {
    ...extremeTracks,
    play: async context => {
        await extremeTracks.play!(context)
        const {canvas, userEvent} = context
        await expect(canvas.getByRole('cell', {name: '2,147,483,647'})).toBeVisible()
        const prepare = canvas.getByRole('cell', {name: 'Fast Track'}).closest('tr')!.children[5]
        await userEvent.hover(prepare.querySelector('[data-slot=tooltip-trigger]')!)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(/^1 block$/)
    },
}

// periods that stop between two whole units of time
export const TracksUnevenPeriods: StoryObj = {
    ...tracksTab([track('60', 'uneven_track', {preparePeriod: 540, decisionPeriod: 36_000, confirmPeriod: 2_100, minEnactmentPeriod: 45})]),
    play: async ({canvasElement}) => {
        await waitFor(() => expectLegibleAxes(canvasElement))
        const row = canvasElement.querySelector<HTMLTableRowElement>('tbody tr')!
        await expect([...row.cells].slice(-4).map(cell => cell.textContent)).toEqual(['1h 30m', '4d 4h', '5h 50m', '7m 30s'])
    },
}

const manyTracks = tracksTab(Array.from({length: 24}, (_, i) => track(String(i), `track_${i}`, {minApproval: CURVES[i % 3], minSupport: linear(1e9, 0, 2e8 + i * 1e7)})))

// two-digit ids come after the single digits
export const TracksMany: StoryObj = {
    ...manyTracks,
    play: async context => {
        await manyTracks.play!(context)
        await expect(columnTexts(context.canvasElement, 'Track')).toEqual(Array.from({length: 20}, (_, i) => `Track ${i}`))
    },
}
