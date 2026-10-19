import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {Card} from '@/components/ui/card'
import type {MultisigOpRow, MultisigSide} from '@/lib/gql'
import {CHAIN, ME, MULTISIG_ENDS, multisigOp, multisigOps, SIGNATORIES, SUBJECT} from '../../../../mock/fixtures/accounts.js'
import {MultisigTable} from './MultisigTable'

const meta = {title: 'Components/Account/MultisigTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const headers = (root: HTMLElement) => [...root.querySelectorAll('th')].map(th => th.textContent)
const column = (root: HTMLElement, i: number) => [...root.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent)

const table = (rows: MultisigOpRow[], side: MultisigSide) => (
    <Card size="flush">
        <MultisigTable rows={rows} side={side} hex={SUBJECT} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([], 'signatory')}

export const One: Story = {render: () => table([multisigOp(0)], 'signatory')}

// signed, not yet signed while open, and never signed once closed
export const EveryStatus: Story = {
    render: () => table(multisigOps(), 'signatory'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Multisig address', 'Call hash', 'Approving', 'Signed', 'Signatories', 'Opened by', 'Status'])
        expect(column(canvasElement, 4)).toEqual(['Signed', 'Signed', 'Not signed', 'Not signed', 'Not signed', 'Not yet'])
        expect(column(canvasElement, 7)).toEqual(['Pending', 'Pending', 'Executed', 'Exec failed', 'Cancelled', 'Pending'])
    },
}

export const AsMultisigAddress: Story = {
    render: () => table(MULTISIG_ENDS.map((end, i) => multisigOp(i, {threshold: 3, ...end, multisig: ME, depositor: multisigOp(i).multisig, signatories: SIGNATORIES})), 'address'),
    play: ({canvasElement}) => {
        expect(headers(canvasElement)).toEqual(['When', 'Call hash', 'Approving', 'Signatories', 'Opened by', 'Status'])
        expect(column(canvasElement, 3)).toEqual(Array(MULTISIG_ENDS.length).fill('5'))
    },
}
