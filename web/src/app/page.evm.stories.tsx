import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, within} from 'storybook/test'
import {expectTimesFit} from '../../.storybook/fit'
import {pageMeta, pageStory} from '../../.storybook/page'
import Home from './page'
import {expectActivityFit, far, firstBlock, genesisOnly, home, listCard, listRows, many} from './page.stories.helpers'

export default {title: 'Pages/Home/EVM txs', ...pageMeta(Home)}

const open = {searchParams: {activity: 'evm'}}
const amounts = (root: HTMLElement) => listRows(root, 'Activity').map(row => row.querySelector('[data-slot=activity-amount]')!.textContent)

export const Empty: StoryObj = {
    ...pageStory(home(genesisOnly), open),
    play: async ({canvasElement}) => expect(within(listCard(canvasElement, 'Activity')).getByText('No EVM transactions yet.')).toBeVisible(),
}

export const One: StoryObj = {
    ...pageStory(home(firstBlock), open),
    play: async ({canvasElement}) => expect(amounts(canvasElement)).toEqual(['17 NUMN']),
}

export const Many: StoryObj = {
    ...pageStory(home(many), open),
    play: async ({canvasElement}) => {
        expect(listRows(canvasElement, 'Activity')).toHaveLength(5)
        expectActivityFit(canvasElement)
        expectTimesFit(listCard(canvasElement, 'Activity'))
    },
}


// what the sender paid comes first, the rest of its legs behind a count, and a tx that moved
// nothing for the sender shows the value it carried
export const Amounts: StoryObj = {
    ...pageStory(home(many), open),
    play: async ({canvasElement}) => expect(amounts(canvasElement)).toEqual(['≈29.01K NDEX+2', '66.35 NDEX-LP+2', '2,500 NUMN', '0 NUMN', '0 NUMN']),
}

// adding liquidity pays a token and the native coin and gets the pool's share token back
export const LegsHovered: StoryObj = {
    ...pageStory(home(many), open),
    play: async ({canvasElement, userEvent}) => {
        await userEvent.hover(within(listRows(canvasElement, 'Activity')[0]).getByText('+2'))
        await expect(await screen.findByRole('tooltip')).toHaveTextContent('Out≈29.01K NDEXOut1 NUMNIn166.66 NDEX-LP')
    },
}

// a deployment has no recipient, its To names the contract it created
export const Create: StoryObj = {
    ...pageStory(home(many), open),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Activity')[3]).toHaveTextContent(/To\s*create → 0x/),
}

export const Reverted: StoryObj = {
    ...pageStory(home(many), open),
    play: async ({canvasElement}) => expect(listRows(canvasElement, 'Activity').map(row => within(row).getByText(/^(OK|Revert)$/).textContent)).toEqual(['OK', 'OK', 'OK', 'OK', 'Revert']),
}

// the largest amounts and the longest symbol a row carries, and an exit reason longer than OK
export const Extremes: StoryObj = {...pageStory(home(far), open), play: async ({canvasElement}) => expectActivityFit(canvasElement)}
