import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {withEventViews} from '@/lib/args'
import type {EventRow} from '@/lib/gql'
import {CHAIN_PROPS} from '../../../mock/fixtures/blocks.js'
import {EventsTable} from './EventsTable'
import {Card} from './ui/card'
import {BLOCK_EVENTS, opening} from './EventsTable.stories.helpers'

const meta = {title: 'Pages/Events/List'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const inList = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={withEventViews(rows)} view="list" chain={CHAIN_PROPS} />
        </Card>
    ),
})

// runtime events stand without an extrinsic, a batch item names the call that raised it
export const SessionAndBatch: Story = {
    ...inList(BLOCK_EVENTS),
    play: async ({canvas}) => {
        await expect(canvas.getAllByText('from Balances.transfer_keep_alive').length).toBeGreaterThan(0)
        await expect(canvas.getAllByText('Initialization').length).toBeGreaterThan(0)
        await expect(canvas.getAllByText('Finalization').length).toBeGreaterThan(0)
    },
}

export const OneRow = inList(BLOCK_EVENTS.slice(0, 1))

export const Empty = inList([])

export const RowExpanded: Story = {
    ...inList(BLOCK_EVENTS),
    play: async context => {
        await opening('System.ExtrinsicSuccess')!(context)
        await expect(within(context.canvasElement).getByText('dispatchInfo')).toBeVisible()
    },
}
