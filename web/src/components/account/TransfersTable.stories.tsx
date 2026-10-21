import type {Decorator, Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import {WellKnownProvider} from '@/components/wellKnown'
import type {TransferRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {accountTransferCases, CHAIN, PRIME_KEY, SUBJECT} from '../../../../mock/fixtures/accounts.js'
import {TransfersTable} from './TransfersTable'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(CHAIN.treasuryAccount, CHAIN.ss58)} prime={ss58Encode(PRIME_KEY.id, CHAIN.ss58)} evmChainId={CHAIN.evmChainId}>
        <Story />
    </WellKnownProvider>
)

const meta = {title: 'Pages/Account/Transfers | Native', decorators: [wellKnown]} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: TransferRow[], filtered?: boolean) => (
    <Card size="flush">
        <TransfersTable rows={rows} hex={SUBJECT} chain={CHAIN} filtered={filtered} />
    </Card>
)

export const EdgeCases: Story = {render: () => table(accountTransferCases())}
