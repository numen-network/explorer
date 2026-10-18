import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {ProposedRow} from '@/lib/gql'
import {CHAIN, EVERY_REFUND, proposals} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {ProposedTable} from './ProposedTable'

const meta = {title: 'Components/Account/ProposedTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: ProposedRow[]) => (
    <Card size="flush">
        <ProposedTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table(proposals(1))}

// held on an open referendum, claimable, kept for good after a rejection, slashed by a kill, refunded, and a referendum without a title
export const EveryRefund: Story = {
    render: () => table(EVERY_REFUND),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Referendum')).toEqual(['#9 · Referendum 9 title', '#8 · Referendum 8 title', '#7', '#4 · Referendum 4 title', '#1 · Referendum 1 title'])
        expect(columnTexts(canvasElement, 'Deposit')).toEqual(['SubmissionDecision', 'SubmissionDecision', 'Submission', 'SubmissionDecision', 'Decision'])
        expect(columnTexts(canvasElement, 'Amount')).toEqual(['5 NUMN1,000 NUMN', '5 NUMN1,000 NUMN', '5 NUMN', '5 NUMN1,000 NUMN', '1,000 NUMN'])
        expect(columnTexts(canvasElement, 'Refund')).toEqual(['——', 'RefundableRefundable', 'Never refunded', '#991,000 · Slashed#991,000 · Slashed', '#980,000 · Refunded'])
        expect(columnTexts(canvasElement, 'Track')).toEqual(['Small Spender', 'Small Spender', 'Small Spender', 'Treasurer', 'Big Spender'])
    },
}

export const Many: Story = {render: () => table(proposals(20))}
