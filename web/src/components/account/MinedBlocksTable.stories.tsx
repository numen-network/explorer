import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {MinedBlockRow} from '@/lib/gql'
import {CHAIN, minedBlockRows} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {MinedBlocksTable} from './MinedBlocksTable'

const meta = {title: 'Pages/Account/Mining'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: MinedBlockRow[]) => (
    <Card size="flush">
        <MinedBlocksTable rows={rows} chain={CHAIN} />
    </Card>
)

export const BlocksEmpty: Story = {render: () => table([])}

// the mint and the fee share in their own columns, fees on every other block
export const BlocksMany: Story = {
    render: () => table(minedBlockRows(20)),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Production reward')).toContain(`150 ${CHAIN.symbol}`)
        const fees = columnTexts(canvasElement, 'Fees')
        await expect(fees).toContain(`0.0021 ${CHAIN.symbol}`)
        await expect(fees).toContain(`0 ${CHAIN.symbol}`)
    },
}
