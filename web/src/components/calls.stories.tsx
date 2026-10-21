import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect} from 'storybook/test'
import type {CallCount, CallRef} from '@/lib/gql'
import {CallCell, CallPill} from './calls'

const meta = {title: 'Components/Calls'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[minmax(0,1fr)] items-center gap-1 py-2 sm:grid-cols-[220px_minmax(0,1fr)] sm:gap-4">
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
        await expect(canvas.getByText('in Utility.batch_all')).toBeVisible()
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
            <Case label="a call inside a batch">
                <CallCell call={call('Referenda.submit')} leaves={null} within={call('Utility.batch_all')} />
            </Case>
        </>
    ),
}
