import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {withEventViews} from '@/lib/args'
import type {EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {CHAIN_PROPS, mined, pick, proxied, timestampSet} from '../../../mock/fixtures/blocks.js'
import {EventsTable} from './EventsTable'
import {Card} from './ui/card'
import {opening} from './EventsTable.stories.helpers'

const meta = {title: 'Pages/Extrinsic/Events'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const PROXY_EVENTS = pick(mined(HEAD - 120, [timestampSet, proxied]), 1).events as EventRow[]

const inExtrinsic = (rows: EventRow[]): Story => ({
    render: () => (
        <Card size="flush">
            <EventsTable rows={withEventViews(rows)} view="extrinsic" parent={{pallet: 'Proxy', method: 'proxy'}} chain={CHAIN_PROPS} />
        </Card>
    ),
})

export const Proxied = inExtrinsic(PROXY_EVENTS)

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
    ...inExtrinsic(PROXY_EVENTS.map(e => ({...e, block: {...e.block, specVersion: 999}}))),
    play: async context => {
        await opening('Balances.Transfer')!(context)
        const canvas = within(context.canvasElement)
        await expect(canvas.queryByRole('tab', {name: 'Table'})).toBeNull()
        await expect(canvas.getByText(/"amount"/)).toBeVisible()
    },
}
