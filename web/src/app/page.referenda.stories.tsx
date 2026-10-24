import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
import {expectTimesFit} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {NEAREST, UPCOMING, UPCOMING_SPENDS, expectLevel, expectReferendaFit, far, firstBlock, genesisOnly, home, listCard, listRows, many, strips} from './page.stories.helpers'

export default {title: 'Pages/Home/Referenda', ...pageMeta(Home)}

export const Empty: StoryObj = {
    ...pageStory(home(genesisOnly)),
    play: async ({canvasElement}) => expect(within(listCard(canvasElement, 'Governance')).getByText('No referenda yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pageStory(home(firstBlock)),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Governance').map(row => within(row).getByRole('link', {name: /^#\d+$/}).textContent)).toEqual(['#0']),
}

export const Many: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => {
        expect(listRows(canvasElement, 'Governance')).toHaveLength(5)
        expectReferendaFit(canvasElement)
        expectTimesFit(listCard(canvasElement, 'Governance'))
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
        expect(listRows(canvasElement, 'Governance').map(row => row.querySelector('[data-slot=badge]')!.textContent)).toEqual(['Timed out', 'Approved', 'Killed', 'Cancelled', 'Rejected']),
}

// a proposal the index could not decode has no title and no amount, so the row
// goes by its track and number and shows a dash for the amount
const undecoded = {...referenda[3], id: '12', index: 12, title: null, proposalPallet: null, proposalMethod: null, proposalPayouts: null, proposalAmount: null, proposalBeneficiary: null}

export const UndecodedProposal: StoryObj = {
    ...pageStory(home({...many, referendums: [undecoded]})),
    play: async ({canvasElement}) => {
        const [row] = listRows(canvasElement, 'Governance')
        expect(within(row).getByText('[Medium Spender] Referendum #12')).toBeInTheDocument()
        expect(within(row).getByText('—')).toBeInTheDocument()
    },
}

// an amount a hair under ten billion coins reads cut at the coin, never rounded up
export const AmountTruncated: StoryObj = {
    ...pageStory(home({...many, referendums: [{...referenda[4], id: '30', index: 30, proposalAmount: '9999999999999999999999999999'}]})),
    play: async ({canvasElement}) => expect(within(listRows(canvasElement, 'Governance')[0]).getByText('9,999,999,999 NUMN')).toBeInTheDocument(),
}

// the widest number and amount a row holds
export const Extremes: StoryObj = {...pageStory(home(far)), play: async ({canvasElement}) => expectReferendaFit(canvasElement)}

const deadlineScene = (upcoming: object) => pageStory(home({...many, spends: UPCOMING_SPENDS, upcoming}))

export const DeadlinesOne: StoryObj = {
    ...deadlineScene({ongoing: [UPCOMING.ongoing[1]]}),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual([NEAREST[1]])
        expect(within(listCard(canvasElement, 'Governance')).queryByRole('button', {name: /^Show/})).toBeNull()
        expectLevel(canvasElement, 4)
    },
}

export const DeadlinesThree: StoryObj = {
    ...deadlineScene({ongoing: UPCOMING.ongoing.slice(0, 3)}),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual([NEAREST[0], NEAREST[1], NEAREST[3]])
        expect(within(listCard(canvasElement, 'Governance')).queryByRole('button', {name: /^Show/})).toBeNull()
        expectLevel(canvasElement, 2)
    },
}

export const DeadlinesMany: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement}) => {
        expect(strips(canvasElement)).toEqual(NEAREST.slice(0, 3))
        expect(within(listCard(canvasElement, 'Governance')).getByRole('button', {name: 'Show 4 more'})).toBeVisible()
        expectLevel(canvasElement, 2)
    },
}

export const DeadlinesExpanded: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement, userEvent}) => {
        const card = within(listCard(canvasElement, 'Governance'))
        await userEvent.click(card.getByRole('button', {name: 'Show 4 more'}))
        expect(strips(canvasElement)).toEqual(NEAREST)
        expect(card.getByRole('button', {name: 'Show less'})).toBeVisible()
        expectLevel(canvasElement, 1)
    },
}

export const DeadlinesTitleHovered: StoryObj = {
    ...deadlineScene(UPCOMING),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(within(listCard(canvasElement, 'Governance')).getByRole('link', {name: 'Treasury spend #4'}))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent('Wallet audit, second stage')
    },
}

// a referendum without a title names itself in the tip
export const DeadlinesUntitled: StoryObj = {
    ...deadlineScene({ongoing: [UPCOMING.ongoing[2]]}),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(within(listCard(canvasElement, 'Governance')).getByRole('link', {name: 'Referendum #9'}))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent('Referendum #9')
    },
}

const pairs = (root: HTMLElement) => [...listCard(root, 'Governance').querySelectorAll('[data-slot=threshold-pair]')]
const deciding = referenda.find(r => r.status === 'Ongoing' && r.decidingSince != null && r.confirmingSince == null)!

// only the referenda still deciding or confirming carry both thresholds
export const ThresholdsLive: StoryObj = {
    ...pageStory(home(many)),
    play: async ({canvasElement}) => {
        const marked = listRows(canvasElement, 'Governance').filter(row => row.querySelector('[data-slot=threshold-pair]'))
        expect(marked.map(row => row.querySelector('[data-slot=badge]')!.textContent)).toEqual(['Confirming', 'Deciding'])
        expectReferendaFit(canvasElement)
    },
}

export const ThresholdsHovered: StoryObj = {
    ...pageStory(home({...many, referendums: [deciding]})),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(pairs(canvasElement)[0])
        const tip = await screen.findByRole('tooltip')
        expect(tip).toHaveTextContent(/^Approval \S+% need \S+%Support \S+% need \S+%$/)
    },
}

// with nothing cast the approval bar has no split to draw and stays grey
export const ThresholdsNoVotes: StoryObj = {
    ...pageStory(home({...many, referendums: [{...deciding, ayes: '0', nays: '0'}]})),
    play: async ({canvasElement}) => {
        const [approval] = pairs(canvasElement)[0].children
        expect(approval.querySelector('.bg-good')).toBeNull()
        expect(approval.querySelector('.bg-border')).not.toBeNull()
    },
}
