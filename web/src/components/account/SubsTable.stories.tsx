import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {CHAIN, subRows} from '../../../../mock/fixtures/accounts.js'
import {hashOf} from '../../../../mock/fixtures.js'
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

// the last sub is filed under a hash, which truncates at the width of a 32 byte name
export const Many: Story = {
    render: () => table(subRows(20)),
    play: async ({canvas}) => {
        const hashed = canvas.getByText(`BlakeTwo256 ${hashOf('sub', 1)}`)
        expect(hashed.scrollWidth).toBeGreaterThan(hashed.clientWidth)
    },
}
