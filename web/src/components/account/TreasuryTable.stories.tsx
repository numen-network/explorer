import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {TreasuryPayoutRow} from '@/lib/gql'
import {CHAIN, EVERY_PAYOUT, payouts} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {TreasuryTable} from './TreasuryTable'

const meta = {title: 'Components/Account/TreasuryTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: TreasuryPayoutRow[], filtered?: boolean) => (
    <Card size="flush">
        <TreasuryTable rows={rows} chain={CHAIN} filtered={filtered} />
    </Card>
)

export const Empty: Story = {
    render: () => table([]),
    play: async ({canvasElement}) => expect(canvasElement.querySelector('tbody td')!.textContent).toBe('No payments yet.'),
}

export const FilteredEmpty: Story = {
    render: () => table([], true),
    play: async ({canvasElement}) => expect(canvasElement.querySelector('tbody td')!.textContent).toBe('No matching payments.'),
}

export const One: Story = {render: () => table(payouts(1))}

// each source paying each role, a spend_local with no referendum and a bounty and a child without a description
export const EverySource: Story = {
    render: () => table(EVERY_PAYOUT as TreasuryPayoutRow[]),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Source')).toEqual([
            'Spend #4',
            'Child bounty #3-1 · Audit report review',
            'Bounty #3 · Wallet audit',
            'Bounty #3 · Wallet audit',
            'Child bounty #3-2',
            'Bounty #2',
            'Spend #1',
        ])
        expect(columnTexts(canvasElement, 'Role')).toEqual(['Beneficiary', 'Beneficiary', 'Beneficiary', 'Curator', 'Curator', 'Beneficiary', 'Beneficiary'])
        expect(columnTexts(canvasElement, 'Referendum')).toEqual(['#28', '—', '#12', '#12', '—', '#12', '—'])
        expect(columnTexts(canvasElement, 'Amount')).toEqual(['20,000 NUMN', '500 NUMN', '4,500 NUMN', '380 NUMN', '25 NUMN', '1,200 NUMN', '2,000 NUMN'])
    },
}

export const Many: Story = {render: () => table(payouts(20))}
