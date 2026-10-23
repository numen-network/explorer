import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import BlockPage from './page'
import {BUSY, detail} from './page.stories.helpers'

export default {title: 'Pages/Block/Tabs', ...pageMeta(BlockPage)}

// opened without a tab the page lands on Extrinsics, and every tab counts its list
export const EveryTab: StoryObj = {
    ...detail(BUSY),
    play: async ({canvas, canvasElement}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Block contents'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Extrinsics/)
        expect(['extrinsics', 'events', 'logs'].map(slug => tabCount(canvasElement, slug))).toEqual(['9', '88', '3'])
    },
}
