import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {MULTISIG_ENDS, multisigOp, multisigOps} from '../../../../mock/fixtures/accounts.js'
import {batchAll} from '../../../../mock/fixtures/blocks.js'
import {headers, column, withCall, table, expand} from './MultisigTable.stories.helpers'

const meta = {title: 'Pages/Account/Multisig | As a multisig signatory'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// the expanded panel's approvals as signatory and action
const approvals = (root: HTMLElement) =>
    [...root.querySelectorAll('tbody table tbody tr')].map(tr => [tr.children[0].textContent, tr.children[1].textContent])

export const Empty: Story = {render: () => table([], 'signatory')}

export const One: Story = {render: () => table([multisigOp(0)], 'signatory')}

// signed, not yet signed while open, and never signed once closed
export const EveryStatus: Story = {
    render: () => table(multisigOps(), 'signatory'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Multisig address', 'Call', 'Approving', 'Signed', 'Signatories', 'Opened by', 'Status', ''])
        expect(column(canvasElement, 4)).toEqual(['Signed', 'Signed', 'Not signed', 'Not signed', 'Not signed', 'Not yet'])
        expect(column(canvasElement, 7)).toEqual(['Pending', 'Pending', 'Executed', 'Exec failed', 'Cancelled', 'Pending'])
    },
}

const executed = withCall(multisigOp(2, MULTISIG_ENDS[2]), batchAll)

// the call's name over its hash, then who signed and the tree it ran
export const ExpandedExecuted: Story = {
    render: () => table([executed.op], 'signatory', {[executed.op.call!.id]: executed.tree}),
    play: async ({canvasElement}) => {
        expect(column(canvasElement, 2)[0]).toMatch(/^Utility\.batch_all0x/)
        await expand(canvasElement, 0)
        expect(approvals(canvasElement)).toEqual([
            ['Polaris Guild', 'Opened'],
            ['Orbit Labs', 'Executed'],
            ['self', 'Not signed'],
        ])
        expect(within(canvasElement).getByRole('heading', {name: 'Call'})).toBeVisible()
        expect(within(canvasElement).queryByText('Dispatched as')).toBeNull()
    },
}

// opened by hash alone, so only the signatories show and the call reads None
export const ExpandedPending: Story = {
    render: () => table([multisigOp(1, MULTISIG_ENDS[1])], 'signatory'),
    play: async ({canvasElement}) => {
        expect(column(canvasElement, 2)).toEqual([expect.stringMatching(/^0x/)])
        await expand(canvasElement, 0)
        expect(approvals(canvasElement)).toEqual([
            ['self', 'Opened'],
            ['Polaris Guild', 'Approved'],
            ['Orbit Labs', 'Not yet'],
        ])
        expect(within(canvasElement).getByText('None')).toBeVisible()
    },
}

const cancelled = withCall(multisigOp(4, MULTISIG_ENDS[4]), batchAll)

export const ExpandedCancelled: Story = {
    render: () => table([cancelled.op], 'signatory', {[cancelled.op.call!.id]: cancelled.tree}),
    play: async ({canvasElement}) => {
        await expand(canvasElement, 0)
        expect(approvals(canvasElement)).toEqual([
            ['Polaris Guild', 'Opened'],
            ['Polaris Guild', 'Cancelled'],
            ['Orbit Labs', 'Not signed'],
            ['self', 'Not signed'],
        ])
    },
}
