import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import data from '../../../../mock/data.js'
import {counted, listed, SPEND_STATUSES, spend} from '../../../../mock/fixtures/governance.js'
import {tabCount} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Tabs', ...pageMeta(GovernancePage)}

const spends = SPEND_STATUSES.map((status, i) => spend(i, status))

// opened without a tab the page lands on Referenda, and every tab counts its list
export const EveryTab: StoryObj = {
    ...pageStory({...data, treasurySpends: listed(spends), treasurySpendsConnection: counted(spends), delegatesConnection: {totalCount: 3}}),
    play: async ({canvas}) => {
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['referenda', 'treasury', 'tracks', 'delegates'])
        expect(within(nav).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Referenda/)
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['12', '7', '9', '3'])
    },
}
