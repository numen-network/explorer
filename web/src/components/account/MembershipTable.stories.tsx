import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {MembershipRow} from '@/lib/gql'
import {CHAIN, membership, memberships} from '../../../../mock/fixtures/accounts.js'
import {MembershipTable} from './MembershipTable'

const meta = {title: 'Components/Account/MembershipTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: MembershipRow[]) => (
    <Card size="flush">
        <MembershipTable rows={rows} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {
    render: () => table([membership(0)]),
    play: ({canvasElement}) => {
        const cells = [...canvasElement.querySelectorAll('tbody td')].map(td => td.textContent)
        expect(cells.slice(1)).toEqual(['2 of 3', '1', '7', expect.stringMatching(/^#/)])
    },
}

// thresholds of two and three, nothing pending on every third
export const Many: Story = {render: () => table(memberships(6))}
