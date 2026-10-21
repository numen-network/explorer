import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {vote, voteAction, voteActionRows, voteRows} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Vote history', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: voting(numn(1_000)), votes: [vote(0)], voteActions: [voteAction(0)]}, {tab: 'vote-history'})

// each decision and conviction label, a removal, and a vote carrying 4,500 NUMN of delegated votes
export const EveryCase: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), voteActions: voteActionRows()}, {tab: 'vote-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action')).toEqual(['Voted Aye', 'Removed Nay', 'Voted Nay', 'Voted Split', 'Voted Abstain', 'Voted Aye', 'Voted Aye'])
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['1x', '3x', '3x', '0.1x', '0.1x', '0.1x', '6x'])
        expect(columnTexts(canvasElement, 'Votes').map(t => t!.includes('delegated'))).toEqual([true, false, false, false, false, false, false])
    },
}

const manyVoteActions = Array.from({length: 45}, (_, i) => voteAction(i, {referendum: {index: 47 - i}}))

export const Many = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'vote-history'})

export const Page2 = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'vote-history', page: '2'})
