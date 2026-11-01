import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {delegatedVoteOut} from '../../../../../mock/fixtures/accounts.js'
import {numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, summaries, voting} from './page.stories.helpers'

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
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [...rows(), delegatedVoteOut(6, 'Ongoing', {removed: true})]}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{'All votes': '6', Active: '1', 'Delegated votes': '80K NUMN'}]),
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
