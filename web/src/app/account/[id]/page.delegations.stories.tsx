import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegatedFrom, delegatingTo} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, summaries} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegations', ...pageMeta(AccountPage), decorators: [wellKnown]}

// three tracks at 1,000, 2,000.25 and 3,000.5, the largest is what the account put up
export const OutSummary: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{Tracks: '3', Delegated: '3,000.5 NUMN'}]),
}

// Delegating to rows go by track id, two-digit ids after the single digits
export const TrackOrder: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7)}, {tab: 'delegations'}),
    play: async ({canvasElement}) =>
        expect(columnTexts(canvasElement, 'Track')).toEqual(['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender']),
}

// delegated to as well, the account still lists only its own delegations here, the incoming side waits on its own tab
export const Both: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByText('Delegating to')).toBeInTheDocument()
        expect(canvas.queryByText('Delegated from')).toBeNull()
        expect(summaries(canvasElement)).toHaveLength(1)
    },
}
