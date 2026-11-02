import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedVote, delegatedVoteOut, poll, SUBJECT, vote, voteRows} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, HEAD, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {columnTexts, filterChips} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, build, story, voting, votingTile, recordLegend, recordTip, RECORD_LEGEND} from './page.stories.helpers'

export default {title: 'Pages/Account/Governance | Direct votes', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: voting(numn(1_000)), votes: [vote(0)]}, {tab: 'direct-votes'})

const manyVotes = [...voteRows(), ...Array.from({length: 35}, (_, i) => vote(i + 10, {referendum: poll(47 - i, 'Ongoing', null)}))]

export const Many = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'direct-votes'})

export const Page2 = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'direct-votes', page: '2'})

export const LastPage = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'direct-votes', page: lastPage(manyVotes.length)})

// votes cast in one block list the newest referendum first, #10 between #11 and #9
export const InOneBlock: StoryObj = {
    ...story({account: voting(numn(3_000)), votes: [11, 10, 9].map((index, i) => vote(i, {block: HEAD - 500, referendum: poll(index, 'Ongoing', null)}))}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Referendum').map(t => t!.split(' · ')[0])).toEqual(['#11', '#10', '#9']),
}

// nine standing votes over 14 referenda open in the window, the removed #8 left out
export const Summary: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), counts: {referenda: 14}}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) => {
        const tile = votingTile(canvasElement)
        expect(Object.keys(tile)).toEqual(['Referenda', 'Participation (180d)', 'Votes'])
        expect(tile).toEqual({
            Referenda: {total: '9', Direct: ['9', '100.00%'], Delegated: ['0', '0.00%']},
            'Participation (180d)': {total: '64.28%', Direct: ['64.28%'], Delegated: ['0.00%']},
            Votes: {total: '≈1.53M NUMN', Direct: ['≈1.53M NUMN', '100.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['0 NUMN', '0.00%']},
        })
    },
}

// the votes others delegated through the account join its own
export const SummaryWithReceivedVotes: StoryObj = {
    ...story({account: voting(numn(1_000)), votes: [vote(0)], delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])], refs: [PEOPLE[1]]}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement).Votes).toEqual({total: '5,500 NUMN', Direct: ['1,000 NUMN', '18.18%'], Received: ['4,500 NUMN', '81.81%'], Delegated: ['0 NUMN', '0.00%']}),
}

// the account votes itself, carries delegations and delegates on other tracks
export const SummaryEveryRole: StoryObj = {
    ...story(
        {account: voting(numn(1_000)), votes: [vote(0)], delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])], delegatedVotesOut: [delegatedVoteOut(1, 'Ongoing'), delegatedVoteOut(2, 'Ongoing')], refs: [PEOPLE[1]], counts: {referenda: 4}},
        {tab: 'direct-votes'}
    ),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toEqual({
            Votes: {total: '35.5K NUMN', Direct: ['1,000 NUMN', '2.81%'], Received: ['4,500 NUMN', '12.67%'], Delegated: ['30K NUMN', '84.50%']},
            Referenda: {total: '3', Direct: ['1', '33.33%'], Delegated: ['2', '66.66%']},
            'Participation (180d)': {total: '75.00%', Direct: ['25.00%'], Delegated: ['50.00%']},
        }),
}

// a delegation's votes show hollow on the referenda its delegate voted on,
// and their tooltip names the delegate
export const RecordDelegated: StoryObj = {
    ...story(
        {
            account: voting(numn(250_000)),
            votes: voteRows(),
            delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])],
            delegatedVotesOut: [12, 13, 14, 15, 16, 17].map(i => delegatedVoteOut(i, 'Ongoing', {aye: i % 3 !== 0, voter: PEOPLE[1]})),
            referenda: Array.from({length: 20}, (_, index) => ({index, title: `Referendum ${index} title`})),
            refs: [PEOPLE[1]],
            counts: {referenda: 20},
        },
        {tab: 'direct-votes'}
    ),
    play: async ({canvasElement}) => {
        const tip = await recordTip(canvasElement)
        expect(tip(12)).toEqual({head: '#12 · Referendum 12 title', Track: 'Identity Admin', Status: 'Deciding', Vote: 'Nay', Delegate: 'Orbit Labs', Conviction: '3x', Capital: '5,000 NUMN', Votes: '15K NUMN', Block: '#993,500'})
        expect([6, 13, 19].map(i => tip(i).Vote)).toEqual(['Aye', 'Aye', 'No vote'])
        expect(tip(13).Delegate).toBe('Orbit Labs')
    },
}

// the tooltip of each way the account can vote. each vote kind lists its
// amounts, each lock state its unlock, each referendum its status, and a
// standard vote any delegations it counts
const tooltipVotes = voteRows().map(v => (v.referendum.index === 4 ? {...v, unlockedAt: 800_000} : v))

export const RecordTooltip: StoryObj = {
    ...story(
        {
            account: voting(numn(250_000)),
            votes: tooltipVotes,
            delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1]), delegatedVote(6, 'None', 2_000, PEOPLE[2])],
            refs: [PEOPLE[1], PEOPLE[2]],
            referenda: Array.from({length: 12}, (_, index) => tooltipVotes.find(v => v.referendum.index === index)?.referendum ?? {index, title: `Referendum ${index} title`}),
        },
        {tab: 'direct-votes'}
    ),
    play: async ({canvasElement}) => {
        const tip = await recordTip(canvasElement)
        expect([6, 9, 11].map(tip)).toEqual([
            {head: '#6 · Fund the Q4 explorer roadmap', Track: 'Small Spender', Status: 'Deciding', Vote: 'Aye', Conviction: '1x', Capital: '1,000 NUMN', Votes: '1,000 NUMN', Block: '#999,500', 'Received votes': {Votes: '4,700 NUMN', Delegators: '2', Capital: '3,500 NUMN'}},
            {head: '#9 · Referendum 9 title', Track: 'Root', Status: 'Confirming', Vote: 'Split', Conviction: '0.1x', Aye: '4,000 NUMN', Nay: '1,500 NUMN', Votes: '550 NUMN', Block: '#999,000'},
            {
                head: '#11 · Referendum 11 title',
                Track: 'Wish For Change',
                Status: 'Timed out',
                Vote: 'Abstain',
                Conviction: '0.1x',
                Aye: '100 NUMN',
                Nay: '100 NUMN',
                Abstain: '9,800 NUMN',
                Votes: '1,000 NUMN',
                Block: '#997,000',
                Unlocks: '#520,960 · Unlockable',
            },
        ])
        expect([1, 4].map(i => tip(i).Unlocks)).toEqual(['#2,478,720 · in 5mo 21d', '#800,000 · Unlocked'])
        expect(tip(10)['Received votes']).toBeUndefined()
        expect(tip(5)).toEqual({head: '#5 · Referendum 5 title', Track: 'Referendum Killer', Status: 'Deciding', Vote: 'No vote'})
    },
}

// the delegated votes a referendum counts reach the account's standard vote
// there, and its panel names who delegated
export const Delegated: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])], refs: [PEOPLE[1]]}, {tab: 'direct-votes'}),
    play: async ({canvasElement, userEvent}) => {
        expect(columnTexts(canvasElement, 'Votes')[0]).toBe('5,500 NUMN1,000 + 4,500 received')
        const row = within(canvasElement).getByRole('link', {name: /^#6\b/}).closest('tr')!
        await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
        const list = within(canvasElement).getByText('Delegation list').parentElement!
        expect(columnTexts(list, 'Delegator')).toEqual(['Orbit Labs'])
    },
}

// the type chips count every vote the account cast, removed ones too, and the
// legend under the vote record names each kind of square, the account's own
// votes on one line and its delegation's on the other
export const EveryType: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows()}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['[All 10]', 'Aye 4', 'Nay 4', 'Split 1', 'Abstain 1'])
        expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND)
    },
}

// picking Split asks for split votes only and keeps every chip's count
export const TypeSplit: StoryObj = {
    ...pageStory(
        {...build({account: voting(numn(250_000)), votes: voteRows()}), votes: ({where}: {where: {kind_eq?: string}}) => voteRows().filter(v => v.kind === where.kind_eq)},
        {params: {id: SUBJECT}, searchParams: {tab: 'direct-votes', type: 'split'}}
    ),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['All 10', 'Aye 4', 'Nay 4', '[Split 1]', 'Abstain 1'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['AyeNay'])
    },
}

// with 180 days of blocks past the first seen block, the vote before the window
// stays in Referenda and leaves the rate
export const SummaryWindowFromHead: StoryObj = {
    ...pageStory(
        {...build({account: voting(numn(1_000)), votes: [vote(0), vote(1, {block: 700_000, referendum: poll(1, 'Approved', 720_000)})], counts: {referenda: 4}}), chainInfos: [{...chainInfo, blockTime: 60}]},
        {params: {id: SUBJECT}, searchParams: {tab: 'direct-votes'}}
    ),
    play: async ({canvasElement}) => expect(votingTile(canvasElement)).toMatchObject({Referenda: {total: '2'}, 'Participation (180d)': {total: '25.00%'}}),
}

// the account's first seen block opens the window when it is the later one
export const SummaryWindowFromFirstSeen: StoryObj = {
    ...story({account: voting(numn(1_000)), votes: [vote(0), vote(1, {block: 400_000, referendum: poll(1, 'Approved', 450_000)})], counts: {referenda: 2}}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) => expect(votingTile(canvasElement)).toMatchObject({Referenda: {total: '2'}, 'Participation (180d)': {total: '50.00%'}}),
}

// every vote taken off and no referendum open since, so there is no rate to give
export const SummaryNoOpenReferenda: StoryObj = {
    ...story({account: voting('0'), votes: [vote(0, {removed: true, referendum: poll(6, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}, {tab: 'direct-votes'}),
    play: async ({canvasElement}) =>
        expect(votingTile(canvasElement)).toEqual({
            Votes: {total: '0 NUMN', Direct: ['0 NUMN', '—'], Received: ['0 NUMN', '—'], Delegated: ['0 NUMN', '—']},
            Referenda: {total: '0', Direct: ['0', '—'], Delegated: ['0', '—']},
            'Participation (180d)': {total: '—', Direct: ['—'], Delegated: ['—']},
        }),
}
