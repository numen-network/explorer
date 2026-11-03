import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import data from '../../../../mock/data.js'
import {acct, chainInfo, HEAD, identity, numn, PEOPLE} from '../../../../mock/fixtures.js'
import {listed} from '../../../../mock/fixtures/governance.js'
import {columnTexts} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import {fmtApprox} from '@/lib/format'
import GovernancePage from './page'

export default {title: 'Pages/Governance/Voters', ...pageMeta(GovernancePage)}

interface Voter {
    id: string
    firstSeenBlock: number
    ownVotes: string
    receivedVotes: string
    delegatedVotes: string
    directReferenda: number
    delegatedReferenda: number
    lastVote: {index: number; status: string} | null
    directVoted: number
    delegatedVoted: number
}

const voter = (account: {id: string}, traits: Partial<Voter> = {}): Voter => ({
    ...account,
    firstSeenBlock: 0,
    ownVotes: numn(100),
    receivedVotes: '0',
    delegatedVotes: '0',
    directReferenda: 1,
    delegatedReferenda: 0,
    lastVote: {index: 1, status: 'Ongoing'},
    directVoted: 1,
    delegatedVoted: 0,
    ...traits,
})

// an account first seen at the head opens its window there, where no referendum is open
const OPEN = 6

const votersTab = (rows: Voter[]): StoryObj =>
    pageStory(
        {
            ...data,
            accounts: listed(rows),
            // the participation window opens at genesis
            blocks: (args: {where?: {timestamp_gte?: string}}) => (args.where?.timestamp_gte != null ? [{height: 0}] : data.blocks(args)),
            accountsConnection: {totalCount: rows.length},
            votesConnection: ({where}: {where: {voter: {id_eq: string}}}) => ({totalCount: rows.find(v => v.id === where.voter.id_eq)!.directVoted}),
            delegatedVotesConnection: ({where}: {where: {delegator: {id_eq: string}}}) => ({totalCount: rows.find(v => v.id === where.delegator.id_eq)!.delegatedVoted}),
            referendumsConnection: ({where}: {where?: {OR?: [unknown, {endedAt_gte: number}]}}) => ({totalCount: where?.OR?.[1].endedAt_gte === HEAD ? 0 : OPEN}),
        },
        {searchParams: {tab: 'voters'}}
    )

export const Empty: StoryObj = {
    ...votersTab([]),
    play: async ({canvas}) => expect(canvas.getByText('No voters yet.')).toBeInTheDocument(),
}

export const One = votersTab([voter(PEOPLE[0], {ownVotes: numn(12_500.75), directReferenda: 3, directVoted: 3, lastVote: {index: 5, status: 'Ongoing'}})])

// a voter with every column filled and the largest weight a column holds. a
// delegate others vote through, a delegator that votes only through its
// delegate, and an account first seen at the head with no latest vote on record
const EVERY_CASE = [
    voter(PEOPLE[0], {ownVotes: (2n ** 128n - 1n).toString(), receivedVotes: numn(40_000), delegatedVotes: numn(7_500.5), directReferenda: 120, delegatedReferenda: 3, directVoted: 4, delegatedVoted: 1, lastVote: {index: 41, status: 'Ongoing'}}),
    voter(PEOPLE[1], {ownVotes: numn(500_000), receivedVotes: numn(1_250_000), directReferenda: 6, directVoted: 6, lastVote: {index: 7, status: 'Approved'}}),
    voter(PEOPLE[7], {ownVotes: '0', delegatedVotes: numn(200_000), directReferenda: 0, delegatedReferenda: 2, directVoted: 0, delegatedVoted: 2, lastVote: {index: 7, status: 'Approved'}}),
    voter(PEOPLE[2], {firstSeenBlock: HEAD, ownVotes: numn(0.001), lastVote: null}),
]

export const EveryCase: StoryObj = {
    ...votersTab(EVERY_CASE),
    play: async ({canvasElement}) => {
        const votes = (key: 'ownVotes' | 'receivedVotes' | 'delegatedVotes') => EVERY_CASE.map(v => fmtApprox(v[key], chainInfo.decimals, chainInfo.symbol))
        expect(columnTexts(canvasElement, 'Last vote')).toEqual(['#41', '#7', '#7', '—'])
        expect(columnTexts(canvasElement, 'Referenda')).toEqual(['123', '6', '2', '1'])
        expect(columnTexts(canvasElement, 'Participation (180d)')).toEqual(['83.33%', '100.00%', '33.33%', '—'])
        expect(columnTexts(canvasElement, 'Direct votes')).toEqual(votes('ownVotes'))
        expect(columnTexts(canvasElement, 'Received votes')).toEqual(votes('receivedVotes'))
        expect(columnTexts(canvasElement, 'Delegated votes')).toEqual(votes('delegatedVotes'))
    },
}

export const Many = votersTab(Array.from({length: 40}, (_, i) => voter(acct(100 + i, identity(`Voter ${i}`)), {ownVotes: numn((40 - i) * 1000)})))
