import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {DelegationRow} from '@/lib/gql'
import {CHAIN, CONVICTIONS, delegatedFrom, delegatingTo} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {DelegationsTable} from './DelegationsTable'

const meta = {title: 'Components/Account/DelegationsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (label: string, rows: DelegationRow[], filtered?: boolean) => (
    <Card size="flush">
        <DelegationsTable label={label} rows={rows} chain={CHAIN} filtered={filtered} />
    </Card>
)

export const Empty: Story = {render: () => table('Delegated from', [])}

export const FilteredEmpty: Story = {render: () => table('Delegated from', [], true)}

export const One: Story = {render: () => table('Delegating to', delegatingTo(1))}

// None counts a tenth of the capital, LockedNx N times over
export const EveryConviction: Story = {
    render: () => table('Delegating to', delegatingTo(CONVICTIONS.length)),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['0.1x', '1x', '2x', '3x', '4x', '5x', '6x'])
        expect(columnTexts(canvasElement, 'Capital')).toEqual(['1,000 NUMN', '2,000.25 NUMN', '3,000.5 NUMN', '4,000.75 NUMN', '5,001 NUMN', '6,001.25 NUMN', '7,001.5 NUMN'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual(['100 NUMN', '2,000.25 NUMN', '6,001 NUMN', '12,002.25 NUMN', '20,004 NUMN', '30,006.25 NUMN', '42,009 NUMN'])
    },
}

// the incoming side weighs each delegator the same way
export const EveryConvictionFrom: Story = {
    render: () => table('Delegated from', delegatedFrom(CONVICTIONS.length)),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['2x', '3x', '4x', '5x', '6x', '0.1x', '1x'])
        expect(columnTexts(canvasElement, 'Votes')).toEqual(['7,001 NUMN', '9,001.5 NUMN', '10,002 NUMN', '10,002.5 NUMN', '9,003 NUMN', '100.05 NUMN', '500.5 NUMN'])
    },
}

export const Many: Story = {render: () => table('Delegated from', delegatedFrom(20))}
