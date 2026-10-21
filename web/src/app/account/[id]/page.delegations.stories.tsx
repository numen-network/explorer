import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedFrom, delegatingTo, delegationAction} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts, tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, governanceTabs, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegations', ...pageMeta(AccountPage), decorators: [wellKnown]}

// nobody delegates to this account, so there is no Received tab
export const Out: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('Delegating to')).toBeInTheDocument()
        expect(governanceTabs(canvasElement)).toEqual({delegations: true})
    },
}

// three tracks at 1,000, 2,000.25 and 3,000.5, the largest is what the account put up
export const OutSummary: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{Tracks: '3', Delegated: '3,000.5 NUMN'}]),
}

// Delegating to rows go by track id, two-digit ids after the single digits, and the incoming side waits on its own tab
export const Both: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Track')).toEqual(['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender'])
        await expect(canvas.queryByText('Delegated from')).toBeNull()
        expect(governanceTabs(canvasElement)).toEqual({delegations: true, received: false})
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        expect([tabCount(nav, 'delegations'), tabCount(nav, 'received')]).toEqual(['7', '5'])
        expect(summaries(canvasElement)).toHaveLength(1)
    },
}

// an account that only ever delegated has no votes, and the group opens on its delegations
export const DelegatorOnly: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationsOut: delegatingTo(1), delegationActions: [delegationAction(0)]}, {tab: 'delegations'}),
    play: async ({canvas}) => {
        const sub = within(canvas.getByRole('navigation', {name: 'Governance'})).getAllByRole('link')
        expect(sub.map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'))).toEqual(['delegations', 'delegations-history'])
    },
}
