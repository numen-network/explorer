import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {MULTISIG_CALLS} from '@/lib/gql'
import {ME, MULTISIG_ENDS, multisigOp, SIGNATORIES} from '../../../../mock/fixtures/accounts.js'
import {vestingPayout} from '../../../../mock/fixtures/blocks.js'
import {columnTexts} from '../../../.storybook/fit'
import {headers, withCall, table, expand} from './MultisigTable.stories.helpers'

const meta = {title: 'Pages/Account/Multisig | As a multisig address'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// the account as the multisig over five signatories, the first of them approving
const addressOp = (i: number) => {
    const end = MULTISIG_ENDS[i]
    return multisigOp(i, {threshold: 3, ...end, approvals: SIGNATORIES.slice(0, end.approvals?.length ?? 2), multisig: ME, signatories: SIGNATORIES})
}

// the account is the multisig itself, so the list has no Multisig address or Signed column, and Signatories counts its members
export const OperationsOne: Story = {
    render: () => table([addressOp(2)], 'address'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Call', 'Approving', 'Signatories', 'Opened by', 'Status', ''])
        expect(columnTexts(canvasElement, 'Signatories')).toEqual(['5'])
    },
}

export const EveryStatus: Story = {
    render: () => table(MULTISIG_ENDS.map((_, i) => addressOp(i)), 'address'),
    play: ({canvasElement}) => expect(columnTexts(canvasElement, 'Status')).toEqual(['Pending', 'Pending', 'Executed', 'Exec failed', 'Cancelled', 'Pending']),
}

// a payout batch past what the panel lists points at the extrinsic for the rest
const capped = withCall(addressOp(3), (height: number) => vestingPayout(height, {count: 60}), MULTISIG_CALLS)

export const ExpandedManyCalls: Story = {
    render: () => table([capped.op], 'address', {[capped.op.call!.id]: capped.tree}),
    play: async ({canvasElement}) => {
        await expand(canvasElement, 0)
        expect(within(canvasElement).getByRole('link', {name: /11 more calls on the extrinsic page/})).toHaveAttribute('href', expect.stringMatching(/\?tab=calls$/))
    },
}
