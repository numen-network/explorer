import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {bounty} from '../../../../../mock/fixtures/governance.js'
import {expectFits, expectTimesFit, expectWholeWords} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import BountyPage from './page'
import {detail} from './page.stories.helpers'

export default {title: 'Pages/Bounty/Timeline', ...pageMeta(BountyPage)}

const timeline = (root: HTMLElement) => root.querySelector('ol')!.closest<HTMLElement>('[data-slot=card]')!

// every step's title and time stay whole and inside the card
export const StepsFit: StoryObj = {
    ...detail(bounty(4, 'Active')),
    play: async ({canvasElement}) => {
        const card = timeline(canvasElement)
        const titles = [...card.querySelectorAll('li .font-medium')]
        await expect(titles.length).toBeGreaterThan(0)
        expectWholeWords(...titles)
        expectTimesFit(card)
        expectFits(card)
    },
}

// the chain calls the event BountyCanceled, the step reads cancelled
export const Canceled: StoryObj = {
    ...detail(bounty(0, 'BountyCanceled')),
    play: async ({canvasElement}) => {
        const card = timeline(canvasElement)
        await expect(within(card).getByText('Cancelled')).toBeVisible()
        await expect(card.textContent).not.toMatch(/canceled/i)
    },
}
