import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {Card} from '@/components/ui/card'
import type {MultisigOpRow} from '@/lib/gql'
import {CHAIN, ME, multisigOp, multisigOps, SUBJECT} from '../../../../mock/fixtures/accounts.js'
import {MultisigTable} from './MultisigTable'

const meta = {title: 'Components/Account/MultisigTable'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const table = (rows: MultisigOpRow[]) => (
    <Card size="flush">
        <MultisigTable rows={rows} hex={SUBJECT} chain={CHAIN} />
    </Card>
)

export const Empty: Story = {render: () => table([])}

export const One: Story = {render: () => table([multisigOp(0)])}

export const EveryStatus: Story = {render: () => table(multisigOps())}

export const ViewedFromTheMultisig: Story = {render: () => table(multisigOps().map(o => ({...o, multisig: ME, depositor: o.multisig})))}
