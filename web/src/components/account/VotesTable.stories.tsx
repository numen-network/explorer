import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {AccountVoteRow} from '@/lib/gql'
import {numn} from '../../../../mock/fixtures.js'
import {CHAIN, vote, voteRows} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {VotesTable} from './VotesTable'

const meta = {title: 'Components/Account/VotesTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: AccountVoteRow[], delegated = new Map<number, bigint>()) => (
    <Card size="flush">
        <VotesTable rows={rows} delegated={delegated} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table([vote(0)])}

// aye, nay, split and abstain, every conviction, each phase a referendum ends in, one untitled and one removed
export const EveryKind: Story = {
    render: () => table(voteRows(), new Map([[6, BigInt(numn(4_500))], [10, BigInt(numn(12_000))]])),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Referendum')).toEqual([
            '#6 · Fund the Q4 explorer roadmap',
            '#9 · Referendum 9 title',
            '#10 · Referendum 10 title',
            '#1 · Treasury spend for community events across Asia, Europe and the Americas',
            '#0 · Referendum 0 title',
            '#11 · Referendum 11 title',
            '#2',
            '#3 · Referendum 3 title',
            '#4 · Referendum 4 title',
            '#8 · Referendum 8 titleremoved',
        ])
        expect(columnTexts(canvasElement, 'Status')).toEqual(['Deciding', 'Confirming', 'Approved', 'Rejected', 'Approved', 'Timed out', 'Cancelled', 'Timed out', 'Killed', 'Submitted'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['Aye', 'AyeNay', 'Aye', 'Nay', 'Nay', 'AyeNayAbstain', 'Nay', 'Aye', 'Nay', 'Aye'])
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['1x', '0.1x', '3x', '6x', '0.1x', '0.1x', '2x', '4x', '5x', '1x'])
        expect(columnTexts(canvasElement, 'Capital')).toEqual([
            '1,000 NUMN',
            '4,000 NUMN1,500 NUMN',
            '1,500 NUMN',
            '250,000 NUMN',
            '2,000 NUMN',
            '100 NUMN100 NUMN9,800 NUMN',
            '2,500 NUMN',
            '2,750 NUMN',
            '3,000 NUMN',
            '3,250 NUMN',
        ])
        expect(columnTexts(canvasElement, 'Votes')).toEqual([
            '5,500 NUMN1,000 + 4,500 delegated',
            '400 NUMN150 NUMN',
            '16.5K NUMN4,500 + 12K delegated',
            '1.5M NUMN',
            '200 NUMN',
            '10 NUMN10 NUMN980 NUMN',
            '5,000 NUMN',
            '11K NUMN',
            '15K NUMN',
            '3,250 NUMN',
        ])
    },
}

