import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {SignatoryRow} from '@/lib/gql'
import {CHAIN} from '../../../../mock/fixtures/accounts.js'
import {account, PEOPLE} from '../../../../mock/fixtures.js'
import {SignatoryTable} from './SignatoryTable'

const meta = {title: 'Pages/Account/Multisig | As a multisig address'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: SignatoryRow[]) => (
    <Card size="flush">
        <SignatoryTable rows={rows} chain={CHAIN} />
    </Card>
)

// the last signatory never acted on chain, so it has no account row to name it
export const SignatoriesMany: Story = {
    render: () => table([...PEOPLE.slice(0, 4).map((p, i) => ({account: p, approved: 40 - i * 9, opened: 4 - i})), {account: {id: account(99), identityDisplay: null}, approved: 0, opened: 0}]),
}
