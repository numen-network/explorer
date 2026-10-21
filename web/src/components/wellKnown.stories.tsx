import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import type {IdentityRef} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {chainInfo, person} from '../../../mock/fixtures.js'
import AccountLink from './AccountLink'
import {WellKnownProvider} from './wellKnown'

const meta = {title: 'Components/WellKnown'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const ss58 = (hex: string) => ss58Encode(hex, chainInfo.ss58)

const TREASURY = ss58(chainInfo.treasuryAccount)
const PRIME = person(0)

const CASES: [label: string, id: string, acc?: IdentityRef][] = [
    ['treasury', chainInfo.treasuryAccount],
    ['prime with an identity of its own', PRIME.id, PRIME],
    ['identity', person(1).id, person(1)],
    ['no identity', person(2).id],
]

function Grid({children}: {children: ReactNode}) {
    return (
        <div className="overflow-x-auto">
            <div className="grid w-max grid-cols-[220px_repeat(3,auto)] items-center gap-x-8 gap-y-3 text-sm">
                <span />
                <span className="text-xs text-muted-foreground">list line</span>
                <span className="text-xs text-muted-foreground">full</span>
                <span className="text-xs text-muted-foreground">plain</span>
                {children}
            </div>
        </div>
    )
}

const lines = CASES.flatMap(([label, id, acc]) => [
    <span key={label} className="text-xs text-muted-foreground">
        {label}
    </span>,
    <AccountLink key={`${label} line`} addr={ss58(id)} acc={acc} />,
    <AccountLink key={`${label} full`} addr={ss58(id)} acc={acc} full />,
    <AccountLink key={`${label} plain`} addr={ss58(id)} acc={acc} plain />,
])

export const TreasuryAndPrime: Story = {
    render: () => (
        <WellKnownProvider treasury={TREASURY} prime={ss58(PRIME.id)} evmChainId={chainInfo.evmChainId}>
            <Grid>{lines}</Grid>
        </WellKnownProvider>
    ),
}

export const NoPrime: Story = {
    render: () => (
        <WellKnownProvider treasury={TREASURY} prime="" evmChainId={chainInfo.evmChainId}>
            <Grid>{lines}</Grid>
        </WellKnownProvider>
    ),
}
