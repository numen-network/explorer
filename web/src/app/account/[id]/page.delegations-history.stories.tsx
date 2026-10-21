import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegationAction, delegationActionRows, delegationActionsOf} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegations history', ...pageMeta(AccountPage), decorators: [wellKnown]}

// thirty delegations out of the account beside twelve into it
const outSide = [...delegationActionsOf(30, 'out'), ...delegationActionsOf(12, 'in')]

export const One = story({account: voting(numn(1_000.5)), delegationActions: [delegationAction(0)]}, {tab: 'delegations-history'})

// both methods out of the account, a delegation its own block undid, and nothing that came in
export const EveryCase: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionRows()}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => {
        const verbs = columnTexts(canvasElement, 'Action').map(t => t!.match(/^(Delegated|Undelegated) (to|from|by)/)![0])
        expect(verbs).toEqual(['Undelegated from', 'Delegated to', 'Delegated to'])
        expect(columnTexts(canvasElement, 'Amount').at(-1)).toBe('—')
        expect(columnTexts(canvasElement, 'Conviction').at(-1)).toBe('—')
    },
}

export const Many = story({account: voting(numn(3_000.5)), delegationActions: outSide}, {tab: 'delegations-history'})

export const Page2 = story({account: voting(numn(3_000.5)), delegationActions: outSide}, {tab: 'delegations-history', page: '2'})
