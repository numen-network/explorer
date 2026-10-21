import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {EVERY_PAYOUT, payout, payouts} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips, tabCount} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, roles, voting, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Treasury', ...pageMeta(AccountPage), decorators: [wellKnown]}

// totals by source, a chip per source, and the beneficiary role in the header
export const EverySource: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'treasury')).toBe('7')
        expect(summaries(canvasElement)).toEqual([{'Total received': '≈28.6K NUMN', Spends: '22K NUMN', Bounties: '5,700 NUMN', 'Child bounties': '500 NUMN', 'Curator fees': '405 NUMN'}])
        expect(filterChips(canvasElement, 'Source')).toEqual(['[All 7]', 'Spends 2', 'Bounties 3', 'Child bounties 2'])
        expect(roles(canvasElement)).toContain('Treasury beneficiary')
    },
}

export const Bounties: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury', source: 'Bounty'}),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Source')).toEqual(['All 7', 'Spends 2', '[Bounties 3]', 'Child bounties 2'])
        expect(columnTexts(canvasElement, 'Source')).toEqual(['Bounty #3 · Wallet audit', 'Bounty #3 · Wallet audit', 'Bounty #2'])
    },
}

// curator fees alone earn the tab but not the beneficiary role
export const CuratorOnly: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: [payout(0, 'Bounty', 'Curator', 380, {bounty: {index: 3, description: 'Wallet audit', referendum: null}})]}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'treasury')).toBe('1')
        expect(roles(canvasElement)).not.toContain('Treasury beneficiary')
    },
}

const manyPayouts = payouts(25)

export const Many = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury'})

export const LastPage = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury', page: lastPage(manyPayouts.length)})
