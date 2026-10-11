import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {withEventViews} from '@/lib/args'
import type {EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, CHAIN_PROPS, mined, pick, proxied, sessionStart, timestampSet} from '../../../mock/fixtures/blocks.js'
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
            <EventsTable rows={withEventViews(rows)} view="block" chain={CHAIN_PROPS} />
        </Card>
    ),
})

const inExtrinsic = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={withEventViews(rows)} view="extrinsic" parent={{pallet: 'Proxy', method: 'proxy'}} chain={CHAIN_PROPS} />
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

export const RowExpandedTransfer: Story = {
    ...inExtrinsic(PROXY_EVENTS),
    play: async context => {
        await opening('Balances.Transfer')!(context)
        const canvas = within(context.canvasElement)
        await expect(canvas.getByText('from')).toBeVisible()
        await expect(canvas.getByText('amount')).toBeVisible()
        await expect(canvas.getByRole('tab', {name: 'Table'})).toHaveAttribute('aria-selected', 'true')
    },
}

export const RowExpandedNested: Story = {
    ...inBlock(BLOCK_EVENTS),
    play: async context => {
        await opening('System.ExtrinsicSuccess')!(context)
        const canvas = within(context.canvasElement)
        await expect(canvas.getByText('dispatchInfo')).toBeVisible()
        await expect(canvas.getByText('refTime')).toBeVisible()
    },
}

export const RowExpandedJson: Story = {
    ...inExtrinsic(PROXY_EVENTS),
    play: async context => {
        await opening('Balances.Transfer')!(context)
        const canvas = within(context.canvasElement)
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText(/"amount"/)).toBeVisible()
    },
}

// a runtime newer than the metadata the explorer ships with leaves only the raw args
export const RowExpandedUnknownRuntime: Story = {
    ...inExtrinsic(PROXY_EVENTS.map(e => ({...e, block: {specVersion: 999}}))),
    play: async context => {
        await opening('Balances.Transfer')!(context)
        const canvas = within(context.canvasElement)
        await expect(canvas.queryByRole('tab', {name: 'Table'})).toBeNull()
        await expect(canvas.getByText(/"amount"/)).toBeVisible()
    },
}
