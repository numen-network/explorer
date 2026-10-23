import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import ExtrinsicPage from './page'
import {detail, payout} from './page.stories.helpers'

export default {title: 'Pages/Extrinsic/Tabs', ...pageMeta(ExtrinsicPage)}

// opened without a tab the page lands on Calls, and both tabs count their lists
export const EveryTab: StoryObj = {
    ...detail(payout),
    play: async ({canvas, canvasElement}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Extrinsic'})).getByRole('link', {name: /^Calls/})).toHaveAttribute('aria-current', 'page')
        expect(['calls', 'events'].map(slug => tabCount(canvasElement, slug))).toEqual(['527', '3,689'])
    },
}
