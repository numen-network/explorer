import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import TokenPage from './page'
import {orbit, tokenPage} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token/Tabs', ...pageMeta(TokenPage)}

// opened without a tab the page lands on Holders, the two lists are counted and the contract is not
export const EveryTab: StoryObj = {
    ...tokenPage(orbit),
    play: async ({canvas, canvasElement}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Token'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Holders/)
        expect(['holders', 'transfers'].map(slug => tabCount(canvasElement, slug))).toEqual(['4,286', '30,000'])
        expect(within(canvas.getByRole('navigation', {name: 'Token'})).getByRole('link', {name: 'Contract'})).toBeVisible()
    },
}
