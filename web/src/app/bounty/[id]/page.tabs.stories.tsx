import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {bounty, CHILD_STATUSES, childBounty} from '../../../../../mock/fixtures/governance.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import BountyPage from './page'
import {detail} from './page.stories.helpers'

export default {title: 'Pages/Bounty/Tabs', ...pageMeta(BountyPage)}

const parent = bounty(12, 'Active')

// opened without a tab the page lands on Timeline, and both tabs count their entries
export const EveryTab: StoryObj = {
    ...detail(parent, CHILD_STATUSES.slice(0, 3).map((status, i) => childBounty(12, i, status))),
    play: async ({canvas, canvasElement}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Bounty'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Timeline/)
        expect(['timeline', 'children'].map(slug => tabCount(canvasElement, slug))).toEqual(['6', '3'])
    },
}

// a bounty with no child bounty has no Child bounties tab
export const NoChildBountiesTab: StoryObj = {
    ...detail(parent),
    play: async ({canvasElement}) => expect(tabCount(canvasElement, 'children')).toBeNull(),
}
