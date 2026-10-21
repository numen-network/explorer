import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegationAction, delegationActionRows} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts, tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, bothSides} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegations history', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: voting(numn(1_000.5)), delegationActions: [delegationAction(0)]}, {tab: 'delegations-history'})

// both methods out of the account, and nothing that came in
export const EveryCase: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionRows()}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => {
        const verbs = columnTexts(canvasElement, 'Action').map(t => t!.match(/^(Delegated|Undelegated) (to|from|by)/)![0])
        expect(verbs).toEqual(['Undelegated from', 'Delegated to'])
    },
}

export const Many: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action').every(t => t!.startsWith('Delegated to'))).toBe(true)
        const nav = canvasElement.querySelector('nav[aria-label="Governance"]')!
        expect(tabCount(nav, 'delegations-history')).toBe('12')
        expect(tabCount(nav, 'received-history')).toBe('30')
    },
}
