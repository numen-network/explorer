import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegatedVoteOut, poll, SUBJECT, vote} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {build, wellKnown, story, summaries, voting} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Delegated votes', ...pageMeta(AccountPage), decorators: [wellKnown]}

const STATUSES = ['Ongoing', 'Approved', 'Rejected', 'TimedOut', 'Cancelled', 'Killed']
const rows = () => STATUSES.map((status, i) => delegatedVoteOut(i, status, {aye: i % 2 === 0, conviction: i === 0 ? 'Locked1x' : 'Locked3x'}))
const many = Array.from({length: 45}, (_, i) => delegatedVoteOut(i, 'Approved'))

export const One = story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing')]}, {tab: 'delegated-votes'})

export const Many = story({account: voting(numn(5_000)), delegatedVotesOut: many}, {tab: 'delegated-votes'})

export const Page2 = story({account: voting(numn(5_000)), delegatedVotesOut: many}, {tab: 'delegated-votes', page: '2'})

export const LastPage = story({account: voting(numn(5_000)), delegatedVotesOut: many}, {tab: 'delegated-votes', page: lastPage(many.length)})

// every outcome counts, the row taken off the tally stays listed and leaves the figures
export const Summary: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [...rows(), delegatedVoteOut(6, 'Ongoing', {removed: true})], counts: {referenda: 10}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{'All votes': '6', 'Participation rate (180d)': '60.00%', 'Delegated votes': '80K NUMN'}]),
}

// with 180 days of blocks past the first seen block, the delegated vote before
// the window stays in All votes and leaves the rate
export const SummaryWindowFromHead: StoryObj = {
    ...pageStory(
        {...build({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing'), delegatedVoteOut(1, 'Approved', {block: 700_000, referendum: poll(1, 'Approved', 720_000)})], counts: {referenda: 4}}), chainInfos: [{...chainInfo, blockTime: 60}]},
        {params: {id: SUBJECT}, searchParams: {tab: 'delegated-votes'}}
    ),
    play: async ({canvasElement}) => expect(summaries(canvasElement)[0]).toMatchObject({'All votes': '2', 'Participation rate (180d)': '25.00%'}),
}

// every delegated vote taken off and no referendum open since, so there is no rate to give
export const SummaryNoOpenReferenda: StoryObj = {
    ...story({account: voting('0'), delegatedVotesOut: [delegatedVoteOut(0, 'Rejected', {removed: true, referendum: poll(0, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{'All votes': '0', 'Participation rate (180d)': '—', 'Delegated votes': '0 NUMN'}]),
}

// the account's own vote stays out of this tab's rate
export const SummaryAlsoVoting: StoryObj = {
    ...story({account: voting(numn(5_000)), votes: [vote(0)], delegatedVotesOut: [delegatedVoteOut(1, 'Ongoing')], counts: {referenda: 2}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)[0]).toMatchObject({'All votes': '1', 'Participation rate (180d)': '50.00%'}),
}

export const EverySide: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: rows()}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['[All 6]', 'Aye 3', 'Nay 3'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['Aye', 'Nay', 'Aye', 'Nay', 'Aye', 'Nay'])
    },
}

export const TypeNay = story({account: voting(numn(5_000)), delegatedVotesOut: rows().filter(d => !d.aye)}, {tab: 'delegated-votes', type: 'nay'})

export const Removed = story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing', {removed: true})]}, {tab: 'delegated-votes'})

export const ViaAddressOnly: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing', {voter: {id: person(3).id}})]}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Via')[0]).toMatch(/^nu.{5}….{4}$/),
}
