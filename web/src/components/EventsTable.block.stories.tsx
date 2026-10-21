import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {withEventViews} from '@/lib/args'
import type {EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, CHAIN_PROPS, mined, timestampSet} from '../../../mock/fixtures/blocks.js'
import {EventsTable} from './EventsTable'
import {Card} from './ui/card'
import {BLOCK_EVENTS, opening} from './EventsTable.stories.helpers'

const meta = {title: 'Pages/Block/Events'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const inBlock = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={withEventViews(rows)} view="block" chain={CHAIN_PROPS} />
        </Card>
    ),
})

// an item's events name the inner call that raised them, the batch's own events name the batch
export const BatchItemsNameTheirCall = inBlock(mined(HEAD - 7, [timestampSet, batchAll]).events as EventRow[])

export const OneRow = inBlock(BLOCK_EVENTS.slice(0, 1))

export const RowExpandedNested: Story = {
    ...inBlock(BLOCK_EVENTS),
    play: async context => {
        await opening('System.ExtrinsicSuccess')!(context)
        const canvas = within(context.canvasElement)
        await expect(canvas.getByText('dispatchInfo')).toBeVisible()
        await expect(canvas.getByText('refTime')).toBeVisible()
    },
}
