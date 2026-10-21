import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {MULTISIG_CALLS} from '@/lib/gql'
import {ME, MULTISIG_ENDS, multisigOp, SIGNATORIES} from '../../../../mock/fixtures/accounts.js'
import {vestingPayout} from '../../../../mock/fixtures/blocks.js'
import {headers, column, withCall, table, expand} from './MultisigTable.stories.helpers'

const meta = {title: 'Pages/Account/Multisig | As a multisig address'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const EveryStatus: Story = {
    render: () => table(MULTISIG_ENDS.map((end, i) => multisigOp(i, {threshold: 3, ...end, approvals: SIGNATORIES.slice(0, end.approvals?.length ?? 2), multisig: ME, signatories: SIGNATORIES})), 'address'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Call', 'Approving', 'Signatories', 'Opened by', 'Status', ''])
        expect(column(canvasElement, 3)).toEqual(Array(MULTISIG_ENDS.length).fill('5'))
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
