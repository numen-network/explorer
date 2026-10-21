import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {EVERY_PAYOUT, payout, payouts} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Treasury', ...pageMeta(AccountPage), decorators: [wellKnown]}

// totals by source and a chip per source counting its payments
export const Totals: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(summaries(canvasElement)).toEqual([{'Total received': '≈28.6K NUMN', Spends: '22K NUMN', Bounties: '5,700 NUMN', 'Child bounties': '500 NUMN', 'Curator fees': '405 NUMN'}])
        expect(filterChips(canvasElement, 'Source')).toEqual(['[All 7]', 'Spends 2', 'Bounties 3', 'Child bounties 2'])
    },
}

export const Bounties: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury', source: 'Bounty'}),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Source')).toEqual(['All 7', 'Spends 2', '[Bounties 3]', 'Child bounties 2'])
        expect(columnTexts(canvasElement, 'Source')).toEqual(['Bounty #3 · Wallet audit', 'Bounty #3 · Wallet audit', 'Bounty #2'])
    },
}

// a curator fee alone fills the tab, and the totals file it under Curator fees
export const CuratorOnly: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: [payout(0, 'Bounty', 'Curator', 380, {bounty: {index: 3, description: 'Wallet audit', referendum: null}})]}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Role')).toEqual(['Curator'])
        expect(summaries(canvasElement)).toEqual([{'Total received': '380 NUMN', Spends: '0 NUMN', Bounties: '0 NUMN', 'Child bounties': '0 NUMN', 'Curator fees': '380 NUMN'}])
    },
}

const manyPayouts = payouts(25)

export const Many = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury'})

export const LastPage = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury', page: lastPage(manyPayouts.length)})
