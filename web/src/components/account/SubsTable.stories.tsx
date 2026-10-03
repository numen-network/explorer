import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import {CHAIN, subRows} from '../../../../mock/fixtures/accounts.js'
import {type SubRow, SubsTable} from './SubsTable'

const meta = {title: 'Components/Account/SubsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: SubRow[]) => (
    <Card size="flush">
        <SubsTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table(subRows(1))}

export const Many: Story = {render: () => table(subRows(20))}
