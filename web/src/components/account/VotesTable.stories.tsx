import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {VoteRow} from '@/lib/gql'
import {CHAIN, vote, voteRows} from '../../../../mock/fixtures/accounts.js'
import {VotesTable} from './VotesTable'

const meta = {title: 'Components/Account/VotesTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: VoteRow[]) => (
    <Card size="flush">
        <VotesTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table([vote(0)])}

// aye, nay, split and abstain, every conviction, ongoing, won, lost and removed
export const EveryKind: Story = {render: () => table(voteRows())}
