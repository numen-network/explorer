import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {ProxyRow} from '@/lib/gql'
import {CHAIN, proxyDelegates, proxyFor} from '../../../../mock/fixtures/accounts.js'
import {ProxiesTable} from './ProxiesTable'

const meta = {title: 'Components/Account/ProxiesTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (label: string, rows: ProxyRow[]) => (
    <Card size="flush">
        <ProxiesTable label={label} rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table('Delegates to', [])}

export const One: Story = {render: () => table('Proxy for', proxyFor(1))}

// three types against three delays, no delay first
export const EveryTypeAndDelay: Story = {render: () => table('Delegates to', proxyDelegates(9))}
