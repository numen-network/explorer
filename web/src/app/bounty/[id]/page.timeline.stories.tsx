import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {bounty} from '../../../../../mock/fixtures/governance.js'
import {expectFits, expectTimesFit, expectWholeWords} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import BountyPage from './page'
import {detail} from './page.stories.helpers'

export default {title: 'Pages/Bounty/Timeline', ...pageMeta(BountyPage)}

// every step's title and time stay whole and inside the card
export const Active: StoryObj = {
    ...detail(bounty(4, 'Active')),
    play: async ({canvasElement}) => {
        const titles = [...canvasElement.querySelectorAll('ol li .font-medium')]
        await expect(titles.length).toBeGreaterThan(0)
        expectWholeWords(...titles)
        expectTimesFit(canvasElement)
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}
