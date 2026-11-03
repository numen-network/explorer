import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortAddr} from '@/components/AddressText'
import {ss58Encode} from '@/lib/ss58'
import {delegatedVoteOut, poll, SUBJECT, vote} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts, filterOptions} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {build, wellKnown, story, voting, votingTile, recordLegend, RECORD_LEGEND} from './page.stories.helpers'

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
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toEqual({
            Votes: {total: '80K NUMN', Direct: ['0 NUMN', '0.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['80K NUMN', '100.00%']},
            Referenda: {total: '6', Direct: ['0', '0.00%'], Delegated: ['6', '100.00%']},
            'Participation (180d)': {total: '60.00%', Direct: ['0.00%'], Delegated: ['60.00%']},
        }),
}

// a window opening past the first seen block keeps the delegated vote before it
// in Referenda and out of the rate
export const SummaryWindowFromHead: StoryObj = {
    ...pageStory(build({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing'), delegatedVoteOut(1, 'Approved', {block: 700_000, referendum: poll(1, 'Approved', 720_000)})], counts: {referenda: 4}, windowBlock: 740_800}), {params: {id: SUBJECT}, searchParams: {tab: 'delegated-votes'}}),
    play: async ({canvasElement}) => expect(votingTile(canvasElement)).toMatchObject({Referenda: {total: '2'}, 'Participation (180d)': {total: '25.00%'}}),
}

// every delegated vote taken off and no referendum open since, so there is no rate to give
export const SummaryNoOpenReferenda: StoryObj = {
    ...story({account: voting('0'), delegatedVotesOut: [delegatedVoteOut(0, 'Rejected', {removed: true, referendum: poll(0, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(votingTile(canvasElement)).toMatchObject({Votes: {total: '0 NUMN'}, Referenda: {total: '0'}, 'Participation (180d)': {total: '—', Direct: ['—'], Delegated: ['—']}}),
}

// the account's own vote and its delegation's each take their own row
export const SummaryAlsoVoting: StoryObj = {
    ...story({account: voting(numn(5_000)), votes: [vote(0)], delegatedVotesOut: [delegatedVoteOut(1, 'Ongoing')], counts: {referenda: 2}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toMatchObject({Referenda: {total: '2', Direct: ['1', '50.00%'], Delegated: ['1', '50.00%']}, 'Participation (180d)': {total: '100.00%', Direct: ['50.00%'], Delegated: ['50.00%']}}),
}

// the vote record above the list, its legend in two lines
export const Record: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: rows(), referenda: Array.from({length: 8}, (_, index) => ({index, title: `Referendum ${index} title`})), counts: {referenda: 8}}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND),
}

export const EverySide: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: rows()}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => {
        expect(await filterOptions(canvasElement, 'Type')).toEqual(['[All 6]', 'Aye 3', 'Nay 3'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['Aye', 'Nay', 'Aye', 'Nay', 'Aye', 'Nay'])
    },
}

export const TypeNay = story({account: voting(numn(5_000)), delegatedVotesOut: rows().filter(d => !d.aye)}, {tab: 'delegated-votes', type: 'nay'})

export const Removed = story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing', {removed: true})]}, {tab: 'delegated-votes'})

export const DelegateAddressOnly: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing', {voter: {id: person(3).id}})]}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Delegate')[0]).toMatch(/^nu.{5}….{4}$/),
}

// Orbit Labs cast two of the votes and the address-only delegate one
const byDelegate = () => [delegatedVoteOut(0, 'Ongoing', {voter: person(1)}), delegatedVoteOut(1, 'Approved', {voter: person(1), aye: false}), delegatedVoteOut(2, 'Ongoing')]

export const EveryDelegate: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: byDelegate()}, {tab: 'delegated-votes'}),
    play: async ({canvasElement}) => expect(await filterOptions(canvasElement, 'Delegate')).toEqual(['[All 3]', 'Orbit Labs 2', `${shortAddr(ss58Encode(person(2).id, chainInfo.ss58))} 1`]),
}

export const DelegatePicked: StoryObj = {
    ...story({account: voting(numn(5_000)), delegatedVotesOut: byDelegate()}, {tab: 'delegated-votes', delegate: ss58Encode(person(1).id, chainInfo.ss58)}),
    play: async ({canvasElement}) => expect((await filterOptions(canvasElement, 'Delegate'))!.filter(o => o.startsWith('['))).toEqual(['[Orbit Labs 2]']),
}
