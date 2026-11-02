import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegatedVoteAction, delegatedVoteActionRows, delegatedVoteOut} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, votingTile, recordLegend, RECORD_LEGEND} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegated vote history', ...pageMeta(AccountPage), decorators: [wellKnown]}

const many = Array.from({length: 45}, (_, i) => delegatedVoteAction(i))

export const One = story({account: voting(numn(5_000)), delegatedVoteActions: [delegatedVoteAction(0)]}, {tab: 'delegated-vote-history'})

// the tile above the history counts the delegated votes standing now
export const Summary: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing'), delegatedVoteOut(1, 'Approved')], delegatedVoteActions: delegatedVoteActionRows(), counts: {referenda: 4}}, {tab: 'delegated-vote-history'}),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toEqual({
            Votes: {total: '30K NUMN', Direct: ['0 NUMN', '0.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['30K NUMN', '100.00%']},
            Referenda: {total: '2', Direct: ['0', '0.00%'], Delegated: ['2', '100.00%']},
            'Participation (180d)': {total: '50.00%', Direct: ['0.00%'], Delegated: ['50.00%']},
        }),
}

// the vote record above the history, its legend in two lines
export const Record: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing'), delegatedVoteOut(1, 'Approved')], delegatedVoteActions: delegatedVoteActionRows(), referenda: Array.from({length: 8}, (_, index) => ({index, title: `Referendum ${index} title`}))}, {tab: 'delegated-vote-history'}),
    play: async ({canvasElement}) => expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND),
}

// each event that can change a delegated vote, the ones leaving it not counting marked removed
export const EveryAction: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVoteActions: delegatedVoteActionRows()}, {tab: 'delegated-vote-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action')).toEqual(['Voted', 'Voted', 'Voted', 'Vote removed', 'Delegated', 'Undelegated'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['Aye', 'Nay', 'Aye', 'Aye', 'Aye', 'Aye'])
        expect(columnTexts(canvasElement, 'Conviction')[4]).toBe('0.1x')
        expect(columnTexts(canvasElement, 'Referendum').map(t => t!.endsWith('removed'))).toEqual([false, false, true, true, false, true])
    },
}

export const Many = story({account: voting(numn(5_000)), delegatedVoteActions: many}, {tab: 'delegated-vote-history'})

export const Page2 = story({account: voting(numn(5_000)), delegatedVoteActions: many}, {tab: 'delegated-vote-history', page: '2'})

export const LastPage = story({account: voting(numn(5_000)), delegatedVoteActions: many}, {tab: 'delegated-vote-history', page: lastPage(many.length)})
