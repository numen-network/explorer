import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {ss58Encode} from '@/lib/ss58'
import {SUBJECT, SUBJECT_EVM} from '../../../mock/fixtures/accounts.js'
import {chainInfo} from '../../../mock/fixtures.js'
import AddressText from './AddressText'

const meta = {title: 'Components/AddressText'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const SS58 = ss58Encode(SUBJECT, chainInfo.ss58)

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[160px_minmax(0,1fr)] items-center gap-4 py-2 font-mono text-sm">
            <span className="font-sans text-xs text-muted-foreground">{label}</span>
            <span className="min-w-0 break-all">{children}</span>
        </div>
    )
}

export const Short: Story = {
    render: () => (
        <>
            <Case label="ss58">
                <AddressText addr={SS58} />
            </Case>
            <Case label="H160">
                <AddressText addr={SUBJECT_EVM} />
            </Case>
        </>
    ),
}

export const Full: Story = {
    render: () => (
        <>
            <Case label="ss58">
                <AddressText full addr={SS58} />
            </Case>
            <Case label="H160">
                <AddressText full addr={SUBJECT_EVM} />
            </Case>
        </>
    ),
}
