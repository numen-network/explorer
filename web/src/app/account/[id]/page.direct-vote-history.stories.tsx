import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {vote, voteAction, voteActionRows, voteRows} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, votingTile, recordLegend, RECORD_LEGEND} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Direct vote history', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: voting(numn(1_000)), votes: [vote(0)], voteActions: [voteAction(0)]}, {tab: 'direct-vote-history'})

// the tile above the history counts the votes standing now
export const Summary: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), voteActions: voteActionRows(), counts: {referenda: 14}}, {tab: 'direct-vote-history'}),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toEqual({
            Votes: {total: '≈1.53M NUMN', Direct: ['≈1.53M NUMN', '100.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['0 NUMN', '0.00%']},
            Referenda: {total: '9', Direct: ['9', '100.00%'], Delegated: ['0', '0.00%']},
            'Participation (180d)': {total: '64.28%', Direct: ['64.28%'], Delegated: ['0.00%']},
        }),
}

// the vote record above the history, its legend in two lines
export const Record: StoryObj = {
    ...story({account: voting(numn(5_000)), votes: voteRows(), voteActions: voteActionRows()}, {tab: 'direct-vote-history'}),
    play: async ({canvasElement}) => expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND),
}

// each decision and conviction label, a removal, and a vote carrying 4,500 NUMN of delegated votes
export const EveryCase: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), voteActions: voteActionRows()}, {tab: 'direct-vote-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action')).toEqual(['Voted Aye', 'Removed Nay', 'Voted Nay', 'Voted Split', 'Voted Abstain', 'Voted Aye', 'Voted Aye', 'Voted Nay', 'Voted Aye', 'Voted Aye'])
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['1x', '3x', '3x', '0.1x', '0.1x', '0.1x', '2x', '4x', '5x', '6x'])
        expect(columnTexts(canvasElement, 'Votes').map(t => t!.includes('delegated'))).toEqual([true, false, false, false, false, false, false, false, false, false])
    },
}

// a vote replaced twice, across sides then in amount. a vote cast again after
// its removal. a split replacing a standard vote. a vote sent again unchanged
const REVOTES = [
    voteAction(0, {conviction: 'Locked4x', balance: numn(25_000), referendum: {index: 2}}),
    voteAction(1, {conviction: 'Locked3x', balance: numn(50_000), referendum: {index: 2}}),
    voteAction(2, {aye: false, conviction: 'Locked1x', balance: numn(70_000), referendum: {index: 2}}),
    voteAction(3, {conviction: 'Locked1x', balance: numn(500), referendum: {index: 1}}),
    voteAction(4, {method: 'VoteRemoved', conviction: 'Locked1x', balance: numn(400), referendum: {index: 1}}),
    voteAction(5, {conviction: 'Locked1x', balance: numn(400), referendum: {index: 1}}),
    voteAction(6, {kind: 'Split', aye: null, conviction: null, balance: null, ayeAmount: numn(4_000), nayAmount: numn(1_000), referendum: {index: 0}}),
    voteAction(7, {conviction: 'Locked1x', balance: numn(900), referendum: {index: 0}}),
    voteAction(8, {conviction: 'Locked1x', balance: numn(300), referendum: {index: 3}}),
    voteAction(9, {conviction: 'Locked1x', balance: numn(300), referendum: {index: 3}}),
]

export const ReplacedVotes: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: REVOTES}, {tab: 'direct-vote-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action')).toEqual(['Voted Aye', 'Voted Aye', 'Voted Nay', 'Voted Aye', 'Removed Aye', 'Voted Aye', 'Voted Split', 'Voted Aye', 'Voted Aye', 'Voted Aye'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual([
            '100K NUMN−50K',
            '150K NUMNfrom Nay 70K',
            '70K NUMN',
            '500 NUMN',
            '400 NUMN',
            '400 NUMN',
            '500 NUMNfrom Aye 900',
            '900 NUMN',
            '300 NUMN±0',
            '300 NUMN',
        ])
    },
}

const manyVoteActions = Array.from({length: 45}, (_, i) => voteAction(i, {referendum: {index: 47 - i}}))

export const Many = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'direct-vote-history'})

export const Page2 = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'direct-vote-history', page: '2'})
