import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {MinedBlockRow} from '@/lib/gql'
import {CHAIN, minedBlockRows} from '../../../../mock/fixtures/accounts.js'
import {columnTexts} from '../../../.storybook/fit'
import {MinedBlocksTable} from './MinedBlocksTable'

const meta = {title: 'Components/Account/MinedBlocksTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: MinedBlockRow[]) => (
    <Card size="flush">
        <MinedBlocksTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table(minedBlockRows(1))}

// fees on top of the mint run past two decimals, so those rewards carry ≈
export const Many: Story = {
    render: () => table(minedBlockRows(20)),
    play: async ({canvasElement}) => {
        const rewards = columnTexts(canvasElement, 'Reward')
        await expect(rewards).toContain(`150 ${CHAIN.symbol}`)
        await expect(rewards).toContain(`≈150 ${CHAIN.symbol}`)
    },
}
