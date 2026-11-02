import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {delegatedVote, delegatedVoteOut, poll, SUBJECT, vote, voteRows} from '../../../../mock/fixtures/accounts.js'
import {CHAIN_PROPS} from '../../../../mock/fixtures/blocks.js'
import {HEAD, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import {build, RECORD_LEGEND, recordLegend, voting, votingTile, type Spec} from '../../app/account/[id]/page.stories.helpers'
import {accountSummary} from '@/lib/gql'
import VotingHead from './VotingHead'

// reads the account the way the page does and hands its vote totals down
async function Head() {
    const {accountById} = await accountSummary(SUBJECT)
    return <VotingHead hex={SUBJECT} chain={CHAIN_PROPS} voting={accountById!} />
}

export default {title: 'Components/VotingHead', ...pageMeta(Head)}

const head = (s: Spec) => pageStory(build(s))

const columns = (root: HTMLElement) => [...within(root).getByRole('region', {name: 'Votes'}).parentElement!.children]

// each column's bar as its segments by colour, a | before each one set apart
// by a gap, and empty for a grey bar with no segment
const bars = (root: HTMLElement) =>
    Object.fromEntries(
        columns(root).map(col => {
            const bar = col.children[2]
            const segments = [...bar.children].map(i => (i.classList.contains('ml-[3px]') ? '| ' : '') + [...i.classList].find(c => c.startsWith('bg-'))!.slice(3))
            return [col.children[0].textContent, segments.length === 0 && bar.classList.contains('bg-border') ? 'empty' : segments]
        })
    )

// the account votes itself, carries delegations and delegates elsewhere. the
// tile counts all three and the record draws its delegation's votes hollow
export const EveryRole: StoryObj = {
    ...head({
        account: voting(numn(250_000)),
        votes: voteRows(),
        delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])],
        delegatedVotesOut: [12, 13, 14, 15, 16, 17].map(i => delegatedVoteOut(i, 'Ongoing', {aye: i % 3 !== 0, voter: PEOPLE[1]})),
        referenda: Array.from({length: 20}, (_, index) => ({index, title: `Referendum ${index} title`})),
        refs: [PEOPLE[1]],
        counts: {referenda: 20},
    }),
    play: async ({canvasElement}) => {
        const tile = votingTile(canvasElement)
        expect(Object.keys(tile)).toEqual(['Referenda', 'Participation (180d)', 'Votes'])
        expect(tile).toEqual({
            Referenda: {total: '15', Direct: ['9', '60.00%'], Delegated: ['6', '40.00%']},
            'Participation (180d)': {total: '75.00%', Direct: ['45.00%'], Delegated: ['30.00%']},
            Votes: {total: '≈1.63M NUMN', Direct: ['≈1.53M NUMN', '94.21%'], Received: ['4,500 NUMN', '0.27%'], Delegated: ['90K NUMN', '5.51%']},
        })
        expect(bars(canvasElement)).toEqual({
            Referenda: ['primary', '| delegated'],
            'Participation (180d)': ['primary', '| delegated', '| border'],
            Votes: ['primary', 'delegate', '| delegated'],
        })
        expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND)
    },
}

// only the account's own votes, cast on every open referendum, so each bar is
// one full segment
export const DirectOnly: StoryObj = {
    ...head({account: voting(numn(1_000)), votes: [vote(0)], counts: {referenda: 1}}),
    play: async ({canvasElement}) => {
        expect(votingTile(canvasElement)).toEqual({
            Referenda: {total: '1', Direct: ['1', '100.00%'], Delegated: ['0', '0.00%']},
            'Participation (180d)': {total: '100.00%', Direct: ['100.00%'], Delegated: ['0.00%']},
            Votes: {total: '1,000 NUMN', Direct: ['1,000 NUMN', '100.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['0 NUMN', '0.00%']},
        })
        expect(bars(canvasElement)).toEqual({Referenda: ['primary'], 'Participation (180d)': ['primary'], Votes: ['primary']})
    },
}

// only the account's delegation votes, so each bar opens on a delegated
// segment with no gap before it
export const DelegatedOnly: StoryObj = {
    ...head({account: voting(numn(5_000)), delegatedVotesOut: [delegatedVoteOut(0, 'Ongoing'), delegatedVoteOut(1, 'Ongoing')], counts: {referenda: 4}}),
    play: async ({canvasElement}) => {
        expect(votingTile(canvasElement)).toEqual({
            Referenda: {total: '2', Direct: ['0', '0.00%'], Delegated: ['2', '100.00%']},
            'Participation (180d)': {total: '50.00%', Direct: ['0.00%'], Delegated: ['50.00%']},
            Votes: {total: '30K NUMN', Direct: ['0 NUMN', '0.00%'], Received: ['0 NUMN', '0.00%'], Delegated: ['30K NUMN', '100.00%']},
        })
        expect(bars(canvasElement)).toEqual({Referenda: ['delegated'], 'Participation (180d)': ['delegated', '| border'], Votes: ['delegated']})
    },
}

// a delegation too small for two decimals still shows as a share and a sliver
export const ThinShare: StoryObj = {
    ...head({account: voting(numn(10_000_000)), votes: [vote(0, {balance: numn(10_000_000)})], delegatedVotes: [delegatedVote(6, 'None', 1, PEOPLE[1])], refs: [PEOPLE[1]], counts: {referenda: 1}}),
    play: async ({canvasElement}) => {
        expect(votingTile(canvasElement).Votes).toEqual({total: '≈10M NUMN', Direct: ['10M NUMN', '99.99%'], Received: ['0.1 NUMN', '<0.01%'], Delegated: ['0 NUMN', '0.00%']})
        const sliver = columns(canvasElement).at(-1)!.children[2].children[1]
        expect(sliver.getBoundingClientRect().width).toBeGreaterThanOrEqual(4)
    },
}

// no referendum open since the window's start leaves no rate to give
export const NoOpenReferenda: StoryObj = {
    ...head({account: voting('0'), votes: [vote(0, {removed: true, referendum: poll(6, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}),
    play: async ({canvasElement}) => {
        expect(votingTile(canvasElement)['Participation (180d)']).toEqual({total: '—', Direct: ['—'], Delegated: ['—']})
        expect(bars(canvasElement)['Participation (180d)']).toBe('empty')
    },
}

// no referendum on chain and nothing voted, every figure empty and every bar
// grey, the record still drawn with its legend
export const NothingYet: StoryObj = {
    ...head({account: voting('0'), referenda: [], counts: {referenda: 0}}),
    play: async ({canvasElement}) => {
        expect(votingTile(canvasElement)).toEqual({
            Referenda: {total: '0', Direct: ['0', '—'], Delegated: ['0', '—']},
            'Participation (180d)': {total: '—', Direct: ['—'], Delegated: ['—']},
            Votes: {total: '0 NUMN', Direct: ['0 NUMN', '—'], Received: ['0 NUMN', '—'], Delegated: ['0 NUMN', '—']},
        })
        expect(bars(canvasElement)).toEqual({Referenda: 'empty', 'Participation (180d)': 'empty', Votes: 'empty'})
        expect(recordLegend(canvasElement)).toEqual(RECORD_LEGEND)
    },
}
