import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {HEAD} from '../../../mock/fixtures.js'
import {expectTimesFit} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {expectReferendaFit, far, firstBlock, genesisOnly, home, listCard, listRows, many} from './page.stories.helpers'

export default {title: 'Pages/Home/Referenda', ...pageMeta(Home)}

export const Empty: StoryObj = {
    ...pageStory(home(genesisOnly)),
    play: async ({canvasElement}) => expect(within(listCard(canvasElement, 'Referenda')).getByText('No referenda yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pageStory(home(firstBlock)),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Referenda').map(row => within(row).getByRole('link', {name: /^#\d+$/}).textContent)).toEqual(['#0']),
}

export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => {
        expect(listRows(canvasElement, 'Referenda')).toHaveLength(5)
        expectReferendaFit(canvasElement)
        expectTimesFit(listCard(canvasElement, 'Referenda'))
    },
}

export const TitleHovered: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvas, userEvent}) => {
        const title = canvas.getByText(/deliberately long title/)
        expect(title.scrollWidth).toBeGreaterThan(title.clientWidth)
        await userEvent.hover(title)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(title.textContent!)
    },
}

// every way a referendum can end, in the order the list shows them
export const Ended: StoryObj = {
    ...pageStory(home({...many, referendums: [referenda[0], referenda[1], referenda[7], referenda[9], referenda[10]]})),
    play: async ({canvasElement}) =>
        expect(listRows(canvasElement, 'Referenda').map(row => row.querySelector('[data-slot=badge]')!.textContent)).toEqual(['Timed out', 'Approved', 'Killed', 'Cancelled', 'Rejected']),
}

// a proposal the index could not decode has no title and no amount, so the row
// goes by its track and number and shows a dash for the amount
const undecoded = {...referenda[3], id: '12', index: 12, title: null, proposalPallet: null, proposalMethod: null, proposalPayouts: null, proposalAmount: null, proposalBeneficiary: null}

export const UndecodedProposal: StoryObj = {
    ...pageStory(home({...many, referendums: [undecoded]})),
    play: async ({canvasElement}) => {
        const [row] = listRows(canvasElement, 'Referenda')
        expect(within(row).getByText('[Medium Spender] Referendum #12')).toBeInTheDocument()
        expect(within(row).getByText('—')).toBeInTheDocument()
    },
}

// an amount a hair under ten billion coins reads cut at the coin, never rounded up
export const AmountTruncated: StoryObj = {
    ...pageStory(home({...many, referendums: [{...referenda[4], id: '30', index: 30, proposalAmount: '9999999999999999999999999999'}]})),
    play: async ({canvasElement}) => expect(within(listRows(canvasElement, 'Referenda')[0]).getByText('9,999,999,999 NUMN')).toBeInTheDocument(),
}

// the widest number and amount a row holds
export const Extremes: StoryObj = {...pageStory(home(far)), play: async ({canvasElement}) => expectReferendaFit(canvasElement)}

// one deadline of every kind at a block count that reads cleanly, nearest first, with HEAD at
// a million and ten-second blocks. the referendum deciding for ten more days is left out
const track = (preparePeriod: number, decisionPeriod: number, confirmPeriod: number) => ({preparePeriod, decisionPeriod, confirmPeriod})
const ongoing = (index: number, title: string | null, submittedAt: number, decidingSince: number | null = null, confirmingSince: number | null = null) => ({
    index, title, submittedAt, decidingSince, confirmingSince, track: track(1440, 241_920, 8640),
})
const UPCOMING = {
    ongoing: [
        ongoing(11, 'Fund the block explorer for a year', HEAD - 1000),
        ongoing(7, 'Raise the validator cap', HEAD - 20_000, HEAD - 18_000, HEAD - 7488),
        ongoing(9, null, HEAD - 98_280),
        ongoing(8, 'Mining pool grant', HEAD - 200_000, HEAD - 198_360),
        ongoing(5, 'Ten days to go', HEAD - 160_000, HEAD - 155_520),
    ],
    spendsValid: [{id: 'spend-4', validFrom: HEAD + 10_800, expireAt: HEAD + 270_000, referendum: {index: 6, title: 'Wallet audit, second stage'}}],
    spendsExpire: [{id: 'spend-3', validFrom: HEAD - 100, expireAt: HEAD + 59_040, referendum: {index: 4, title: 'Wallet audit, first stage'}}],
    bountiesDue: [{index: 2, description: 'GPU miner for Apple silicon', updateDue: HEAD + 37_800}],
}
const NEAREST = [
    'Referendum #11 will end preparing in 1h 13m',
    'Referendum #7 will end confirming in 3h 12m',
    'Treasury spend #4 will be valid in 1d 6h',
    'Referendum #9 will time out in 2d 15h',
    'Bounty #2 curator update due in 4d 9h',
    'Referendum #8 will end deciding in 5d 1h',
    'Treasury spend #3 will expire in 6d 20h',
]

const deadlineScene = (upcoming: object) => pageStory(home({...many, upcoming}))
const strips = (root: HTMLElement) => [...listCard(root, 'Referenda').querySelectorAll('.bg-muted')].map(s => s.textContent!.replace(/ /g, ' '))
const shownReferenda = (root: HTMLElement) => listRows(root, 'Referenda').filter(r => r.checkVisibility() && within(r).queryByRole('link', {name: /^#\d+$/}))
const sideBySide = () => matchMedia('(min-width: 64rem)').matches

// side by side the card stays as tall as Transfers, a strip taking one referendum's place
function expectLevel(root: HTMLElement, referendaLeft: number) {
    if (!sideBySide()) return expect(shownReferenda(root)).toHaveLength(5)
    expect(listCard(root, 'Referenda').getBoundingClientRect().height).toBe(listCard(root, 'Transfers').getBoundingClientRect().height)
    expect(shownReferenda(root)).toHaveLength(referendaLeft)
}

export const DeadlinesOne: StoryObj = {
    ...deadlineScene({ongoing: [UPCOMING.ongoing[1]]}),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual([NEAREST[1]])
        expect(within(listCard(canvasElement, 'Referenda')).queryByRole('button', {name: /^Show/})).toBeNull()
        expectLevel(canvasElement, 4)
    },
}

export const DeadlinesThree: StoryObj = {
    ...deadlineScene({ongoing: UPCOMING.ongoing.slice(0, 3)}),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual([NEAREST[0], NEAREST[1], NEAREST[3]])
        expect(within(listCard(canvasElement, 'Referenda')).queryByRole('button', {name: /^Show/})).toBeNull()
        expectLevel(canvasElement, 2)
    },
}

export const DeadlinesMany: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual(NEAREST.slice(0, 3))
        expect(within(listCard(canvasElement, 'Referenda')).getByRole('button', {name: 'Show 4 more'})).toBeVisible()
        expectLevel(canvasElement, 2)
    },
}

export const DeadlinesExpanded: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement, userEvent}) => {
        const card = within(listCard(canvasElement, 'Referenda'))
        await userEvent.click(card.getByRole('button', {name: 'Show 4 more'}))
        expect(strips(canvasElement)).toEqual(NEAREST)
        expect(card.getByRole('button', {name: 'Show less'})).toBeVisible()
        expectLevel(canvasElement, 1)
    },
}

export const DeadlinesTitleHovered: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(within(listCard(canvasElement, 'Referenda')).getByRole('link', {name: 'Treasury spend #4'}))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent('Wallet audit, second stage')
    },
}

// a referendum without a title names itself in the tip
export const DeadlinesUntitled: StoryObj = {
    ...deadlineScene({ongoing: [UPCOMING.ongoing[2]]}),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(within(listCard(canvasElement, 'Referenda')).getByRole('link', {name: 'Referendum #9'}))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent('Referendum #9')
    },
}
