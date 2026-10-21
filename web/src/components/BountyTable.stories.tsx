import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {BountyRow} from '@/lib/gql'
import {bounty, CHAIN} from '../../../mock/fixtures/governance.js'
import {BountyTable} from './BountyTable'
import {Card} from './ui/card'

const meta = {title: 'Pages/Bounties/List'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: object[], filtered?: boolean): Story => ({
    render: () => (
        <Card size="flush">
            <BountyTable rows={rows as BountyRow[]} chain={CHAIN} filtered={filtered} />
        </Card>
    ),
})

export const FilteredEmpty = table([], true)

export const EdgeCases = table([
    bounty(3, 'Proposed', {description: null, referendum: null}),
    bounty(2, 'Active', {description: 'Maintain the community archive node, the snapshot mirror and the public RPC endpoint for twelve months'}),
    bounty(1, 'BountyRejected', {value: '0'}),
    bounty(0, 'BountyClaimed', {value: '987654321098765432109876543210'}),
])
