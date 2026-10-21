import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedFrom, delegatingTo, delegationActionRows, EVERY_PAYOUT, EVERY_REFUND, vote, voteActionRows} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting} from './page.stories.helpers'

export default {title: 'Pages/Account/Tabs', ...pageMeta(AccountPage), decorators: [wellKnown]}

// the eight governance lists share one group
export const EveryGovernanceTab: StoryObj = {
    ...story(
        {account: voting(numn(3_000.5)), votes: [vote(0)], voteActions: voteActionRows(), delegationsOut: delegatingTo(3), delegationsIn: delegatedFrom(2), delegationActions: delegationActionRows(), proposed: EVERY_REFUND, payouts: EVERY_PAYOUT},
        {tab: 'vote-history'}
    ),
    play: async ({canvas}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Governance/)
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['votes', 'vote-history', 'proposed', 'treasury', 'received', 'received-history', 'delegations', 'delegations-history'])
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['1', '7', '5', '7', '2', '3', '3', '2'])
    },
}
