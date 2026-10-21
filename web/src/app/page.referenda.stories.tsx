import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, within} from 'storybook/test'
import {referenda} from '../../../mock/data.js'
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
