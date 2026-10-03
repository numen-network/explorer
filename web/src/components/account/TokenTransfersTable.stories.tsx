import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {TokenTransferRow} from '@/lib/gql'
import {SUBJECT_EVM, tokenTransferCases, tokenTransferRows} from '../../../../mock/fixtures/accounts.js'
import {TokenTransfersTable} from './TokenTransfersTable'

// token icons are keyed by chain id, which only the provider knows
const meta = {title: 'Components/Account/TokenTransfersTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: TokenTransferRow[]) => (
    <Card size="flush">
        <TokenTransfersTable rows={rows} evm={SUBJECT_EVM} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table(tokenTransferRows(1))}

export const Many: Story = {render: () => table(tokenTransferRows(20))}

export const EdgeCases: Story = {render: () => table(tokenTransferCases())}
