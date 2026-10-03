import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {DelegationRow} from '@/lib/gql'
import {CHAIN, CONVICTIONS, delegatedFrom, delegatingTo} from '../../../../mock/fixtures/accounts.js'
import {DelegationsTable} from './DelegationsTable'

const meta = {title: 'Components/Account/DelegationsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (label: string, rows: DelegationRow[]) => (
    <Card size="flush">
        <DelegationsTable label={label} rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table('Delegated from', [])}

export const One: Story = {render: () => table('Delegating to', delegatingTo(1))}

export const EveryConviction: Story = {render: () => table('Delegating to', delegatingTo(CONVICTIONS.length))}

export const Many: Story = {render: () => table('Delegated from', delegatedFrom(20))}
