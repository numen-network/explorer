import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegationActionRows, delegationActionsOf} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts, tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, bothSides} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Received history', ...pageMeta(AccountPage), decorators: [wellKnown]}

// both methods into the account, and a delegation its own block undid
export const EveryCase: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionRows()}, {tab: 'received-history'}),
    play: async ({canvasElement}) => {
        const verbs = columnTexts(canvasElement, 'Action').map(t => t!.match(/^(Delegated|Undelegated) (to|from|by)/)![0])
        expect(verbs).toEqual(['Delegated by', 'Undelegated by', 'Delegated by'])
        expect(columnTexts(canvasElement, 'Amount').at(-1)).toBe('—')
        expect(columnTexts(canvasElement, 'Conviction').at(-1)).toBe('—')
    },
}

export const Many = story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'received-history'})

export const Page2 = story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'received-history', page: '2'})

// an account that only ever delegated out has no Received history
export const None: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationActions: delegationActionsOf(3, 'out')}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => expect(tabCount(canvasElement.querySelector('nav[aria-label="Governance"]')!, 'received-history')).toBeNull(),
}
