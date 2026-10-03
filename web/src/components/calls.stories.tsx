import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {userEvent, within} from 'storybook/test'
import type {AccountRef, CallRef, CallRow, EventRow} from '@/lib/gql'
import {HEAD} from '../../../mock/fixtures.js'
import {batchAll, batchInterrupted, CHAIN_PROPS, heartbeat, mined, pick, proxied, referendumSubmission, timestampSet, transfer, vestingPayout} from '../../../mock/fixtures/blocks.js'
import {CallCell, CallPill, CallTree} from './calls'

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
const times = (n: number, name: string) => Array.from({length: n}, () => call(name))

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
    render: () => (
        <>
            <Case label="wraps nothing">
                <CallCell call={call('Balances.transfer_keep_alive')} />
            </Case>
            <Case label="one inner call">
                <CallCell call={call('Proxy.proxy')} leaves={[call('Balances.transfer_keep_alive')]} />
            </Case>
            <Case label="identical calls counted">
                <CallCell call={call('Utility.batch_all')} leaves={times(7, 'Balances.transfer_keep_alive')} />
            </Case>
            <Case label="different calls that fit">
                <CallCell call={call('Utility.batch_all')} leaves={[call('System.remark'), call('Balances.transfer_keep_alive')]} />
            </Case>
            <Case label="more calls than the line holds">
                <CallCell call={call('Utility.batch_all')} leaves={[call('Preimage.note_preimage'), call('Referenda.submit'), call('Referenda.set_metadata')]} />
            </Case>
            <Case label="a payout batch">
                <CallCell call={call('Utility.batch_all')} leaves={times(526, 'Vesting.vested_transfer')} />
            </Case>
        </>
    ),
}

const tree = (spec: Spec): Story => {
    const {extrinsics, calls, events} = pick(mined(HEAD - 120, [timestampSet, spec]), 1)
    const signer = extrinsics[0].signer as AccountRef | null
    return {render: () => <CallTree calls={calls as CallRow[]} events={events as EventRow[]} chain={CHAIN_PROPS} signer={signer} />}
}

const expandAll: Story['play'] = async ({canvasElement}) => {
    for (const trigger of within(canvasElement).getAllByRole('button', {expanded: false})) await userEvent.click(trigger)
}

export const CallTreeEmpty: Story = {render: () => <CallTree calls={[]} events={[]} chain={CHAIN_PROPS} signer={null} />}

export const CallTreeUnsigned = tree(heartbeat)

export const CallTreeSingleCall = tree(transfer)

export const CallTreeBatch = tree(batchAll)

export const CallTreeBatchInterrupted = tree(batchInterrupted)

export const CallTreeNested = tree(proxied)

export const CallTreeNestedExpanded: Story = {...tree(proxied), play: expandAll}

export const CallTreeLongArgs = tree(referendumSubmission)

export const CallTreePayoutBatch = tree((height: number) => vestingPayout(height, {count: 40}))
