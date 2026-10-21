import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {CHAIN, subRows} from '../../../../mock/fixtures/accounts.js'
import {hashOf} from '../../../../mock/fixtures.js'
import {type SubRow, SubsTable} from './SubsTable'

const meta = {title: 'Pages/Account/Identity | Sub'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: SubRow[]) => (
    <Card size="flush">
        <SubsTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

// the last sub is filed under a hash, which shows its kind and the 0x4…4 split whole
export const HashedSub: Story = {
    render: () => table(subRows(20)),
    play: async ({canvas}) => {
        const hash = hashOf('sub', 1)
        const hashed = canvas.getByText(`BlakeTwo256 ${hash.slice(0, 6)}…${hash.slice(-4)}`)
        expect(hashed.scrollWidth).toBeLessThanOrEqual(hashed.clientWidth)
    },
}
