import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {TokenTransferRow} from '@/lib/gql'
import {SUBJECT_EVM, tokenTransferCases, tokenTransferPoisoning} from '../../../../mock/fixtures/accounts.js'
import {poisonedRows} from '../../../.storybook/fit'
import {TokenTransfersTable} from './TokenTransfersTable'

// token icons are keyed by chain id, which only the provider knows
const meta = {title: 'Pages/Account/Transfers | Tokens'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: TokenTransferRow[]) => (
    <Card size="flush">
        <TokenTransfersTable rows={rows} evm={SUBJECT_EVM} />
    </Card>
)

// a token that answers no symbol or decimals, and an amount at the u128 ceiling
export const EdgeCases: Story = {render: () => table(tokenTransferCases())}

// the two zero transfers neither side sent, one out and one in, against a zero
// one the account sent itself and a third party's real move
export const Poisoning: Story = {
    render: () => table(tokenTransferPoisoning()),
    play: async ({canvas, canvasElement}) => {
        expect(poisonedRows([...canvasElement.querySelectorAll('tbody tr')])).toEqual([false, true, true, false, false])
        expect(canvas.getAllByRole('img', {name: 'Suspected address poisoning'})).toHaveLength(2)
    },
}
