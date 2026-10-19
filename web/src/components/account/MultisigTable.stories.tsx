import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, userEvent, within} from 'storybook/test'
import {Card} from '@/components/ui/card'
import {withCallViews} from '@/lib/args'
import {MULTISIG_CALLS, type CallRow, type MultisigOpRow, type MultisigSide} from '@/lib/gql'
import {CHAIN, ME, MULTISIG_ENDS, multisigCall, multisigOp, multisigOps, SIGNATORIES, SUBJECT} from '../../../../mock/fixtures/accounts.js'
import {batchAll, vestingPayout} from '../../../../mock/fixtures/blocks.js'
import {PEOPLE} from '../../../../mock/fixtures.js'
import type {MultisigCall} from './MultisigDetail'
import {MultisigTable} from './MultisigTable'

const meta = {title: 'Components/Account/MultisigTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const headers = (root: HTMLElement) => [...root.querySelectorAll('th')].map(th => th.textContent)
const column = (root: HTMLElement, i: number) => [...root.querySelectorAll(':scope tbody > tr:not(:has(table))')].map(tr => tr.children[i].textContent)

const ACCOUNTS = Object.fromEntries(PEOPLE.map(p => [p.id, p]))

// an operation and the tree its call reads back as, the panel listing at most shown calls
const withCall = (op: MultisigOpRow, spec: unknown, shown = Infinity) => {
    const tree = multisigCall(op.multisig, spec)
    return {op: {...op, call: tree.call}, tree: {calls: withCallViews(tree.calls.slice(0, shown) as CallRow[]), total: tree.calls.length}}
}

const table = (rows: MultisigOpRow[], side: MultisigSide, calls: Record<string, MultisigCall> = {}) => (
    <Card size="flush">
        <MultisigTable rows={rows} side={side} hex={SUBJECT} calls={calls} accounts={ACCOUNTS} chain={CHAIN} />
    </Card>
)

const expand = async (root: HTMLElement, row: number) => userEvent.click(within(root).getAllByRole('button', {name: 'expand'})[row])

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

export const AsMultisigAddress: Story = {
    render: () => table(MULTISIG_ENDS.map((end, i) => multisigOp(i, {threshold: 3, ...end, approvals: SIGNATORIES.slice(0, end.approvals?.length ?? 2), multisig: ME, signatories: SIGNATORIES})), 'address'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Call', 'Approving', 'Signatories', 'Opened by', 'Status', ''])
        expect(column(canvasElement, 3)).toEqual(Array(MULTISIG_ENDS.length).fill('5'))
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

// a payout batch past what the panel lists points at the extrinsic for the rest
const capped = withCall(multisigOp(3, MULTISIG_ENDS[3]), (height: number) => vestingPayout(height, {count: 60}), MULTISIG_CALLS)

export const ExpandedManyCalls: Story = {
    render: () => table([capped.op], 'address', {[capped.op.call!.id]: capped.tree}),
    play: async ({canvasElement}) => {
        await expand(canvasElement, 0)
        expect(within(canvasElement).getByRole('link', {name: /11 more calls on the extrinsic page/})).toHaveAttribute('href', expect.stringMatching(/\?tab=calls$/))
    },
}
