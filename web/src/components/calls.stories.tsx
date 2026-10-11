import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect, userEvent, within} from 'storybook/test'
import {withCallViews} from '@/lib/args'
import type {AccountRef, CallCount, CallRef, CallRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, batchInterrupted, batchOfProxies, CHAIN_PROPS, heartbeat, mined, pick, proxied, referendumSubmission, timestampSet, transfer, vestingPayout} from '../../../mock/fixtures/blocks.js'
import {CallTree} from './CallTree'
import {CallCell, CallPill} from './calls'

const meta = {title: 'Components/Calls'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

type Spec = Parameters<typeof mined>[1][number]

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div>{children}</div>
        </div>
    )
}

const call = (name: string): CallRef => ({pallet: name.split('.')[0], method: name.split('.')[1]})
const leaf = (name: string, count = 1): CallCount => ({...call(name), count})

export const CallPills: Story = {
    render: () => (
        <>
            <Case label="no inner call">
                <CallPill call={null} />
            </Case>
            <Case label="inner call">
                <CallPill call={call('Balances.transfer_keep_alive')} />
            </Case>
            <Case label="long method name">
                <CallPill call={call('Referenda.refund_submission_deposit')} />
            </Case>
        </>
    ),
}

export const CallCells: Story = {
    play: async ({canvas}) => {
        await expect(canvas.getByText('Preimage.note_preimage · +2 more')).toBeVisible()
        await expect(canvas.getByText('526× Vesting.vested_transfer')).toBeVisible()
        await expect(canvas.getByText('1,234× Vesting.vested_transfer')).toBeVisible()
    },
    render: () => (
        <>
            <Case label="wraps nothing">
                <CallCell call={call('Balances.transfer_keep_alive')} leaves={null} />
            </Case>
            <Case label="one inner call">
                <CallCell call={call('Proxy.proxy')} leaves={[leaf('Balances.transfer_keep_alive')]} />
            </Case>
            <Case label="identical calls counted">
                <CallCell call={call('Utility.batch_all')} leaves={[leaf('Balances.transfer_keep_alive', 7)]} />
            </Case>
            <Case label="different calls that fit">
                <CallCell call={call('Utility.batch_all')} leaves={[leaf('System.remark'), leaf('Balances.transfer_keep_alive')]} />
            </Case>
            <Case label="more calls than the line holds">
                <CallCell call={call('Utility.batch_all')} leaves={[leaf('Preimage.note_preimage'), leaf('Referenda.submit'), leaf('Referenda.set_metadata')]} />
            </Case>
            <Case label="a payout batch">
                <CallCell call={call('Utility.batch_all')} leaves={[leaf('Vesting.vested_transfer', 526)]} />
            </Case>
            <Case label="over a thousand identical calls">
                <CallCell call={call('Utility.batch_all')} leaves={[leaf('Vesting.vested_transfer', 1_234)]} />
            </Case>
        </>
    ),
}

const tree = (spec: Spec): Story => {
    const {extrinsics, calls} = pick(mined(HEAD - 120, [timestampSet, spec]), 1)
    const signer = extrinsics[0].signer as AccountRef | null
    return {render: () => <CallTree calls={withCallViews(calls as CallRow[])} chain={CHAIN_PROPS} signer={signer} />}
}

const expandAll: Story['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

export const CallTreeEmpty: Story = {render: () => <CallTree calls={[]} chain={CHAIN_PROPS} signer={null} />}

export const CallTreeUnsigned: Story = {...tree(heartbeat), play: async ({canvas}) => expect(canvas.getByText('1 event')).toBeVisible()}

export const CallTreeSingleCall: Story = {...tree(transfer), play: async ({canvas}) => expect(canvas.getByText('6 events')).toBeVisible()}

export const CallTreeBatch = tree(batchAll)

export const CallTreeBatchInterrupted = tree(batchInterrupted)

export const CallTreeNested = tree(proxied)

export const CallTreeNestedExpanded: Story = {...tree(proxied), play: expandAll}

export const CallTreeTwoDepths = tree(batchOfProxies)

export const CallTreeLongArgs = tree(referendumSubmission)

export const CallTreePayoutBatch = tree((height: number) => vestingPayout(height, {count: 40}))

// a runtime newer than the metadata the explorer ships with leaves only the raw args
export const CallTreeUnknownRuntime: Story = {
    render: () => {
        const {extrinsics, calls} = pick(mined(HEAD - 120, [timestampSet, transfer]), 1)
        const unknown = withCallViews((calls as CallRow[]).map(c => ({...c, block: {specVersion: 999}})))
        return <CallTree calls={unknown} chain={CHAIN_PROPS} signer={extrinsics[0].signer as AccountRef | null} />
    },
    play: async ({canvas}) => {
        await expect(canvas.queryByRole('tab', {name: 'Table'})).toBeNull()
        await expect(canvas.getByText(/"transfer_keep_alive"|"dest"/)).toBeVisible()
    },
}

export const CallTreeJsonView: Story = {
    ...tree(transfer),
    play: async ({canvas}) => {
        await userEvent.click(canvas.getByRole('tab', {name: 'JSON'}))
        await expect(canvas.getByText(/"dest"/)).toBeVisible()
        await userEvent.click(canvas.getByRole('tab', {name: 'Table'}))
        await expect(canvas.getByText('dest')).toBeVisible()
    },
}
