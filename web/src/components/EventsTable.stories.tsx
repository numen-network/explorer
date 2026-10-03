import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {userEvent, within} from 'storybook/test'
import type {EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, mined, pick, proxied, sessionStart, timestampSet} from '../../../mock/fixtures/blocks.js'
import {EventsTable} from './EventsTable'
import {Card} from './ui/card'

const meta = {title: 'Components/EventsTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const BLOCK_EVENTS = mined(HEAD - 160, [timestampSet, batchAll], {initialization: sessionStart(HEAD - 160)}).events as EventRow[]
const PROXY_EVENTS = pick(mined(HEAD - 120, [timestampSet, proxied]), 1).events as EventRow[]

const inBlock = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={rows} view="block" />
        </Card>
    ),
})

const inExtrinsic = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={rows} view="extrinsic" parent={{pallet: 'Proxy', method: 'proxy'}} />
        </Card>
    ),
})

const opening = (name: string): Story['play'] => async ({canvasElement}) => {
    await userEvent.click(within(canvasElement).getAllByText(name)[0])
}

export const BlockView = inBlock(BLOCK_EVENTS)

export const ExtrinsicView = inExtrinsic(PROXY_EVENTS)

export const OneRow = inBlock(BLOCK_EVENTS.slice(0, 1))

export const EmptyBlockView = inBlock([])

export const EmptyExtrinsicView = inExtrinsic([])

export const RowExpanded: Story = {...inExtrinsic(PROXY_EVENTS), play: opening('Proxy.ProxyExecuted')}

export const RowExpandedWithoutArgs: Story = {...inExtrinsic(PROXY_EVENTS), play: opening('Utility.ItemCompleted')}
