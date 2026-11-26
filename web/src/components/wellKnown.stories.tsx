import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect, screen, within} from 'storybook/test'
import type {IdentityRef} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {chainInfo, person} from '../../../mock/fixtures.js'
import AccountLink from './AccountLink'
import {EvmAddrLink} from './links'
import {WellKnownProvider} from './wellKnown'

const meta = {title: 'Components/WellKnown'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const ss58 = (hex: string) => ss58Encode(hex, chainInfo.ss58)

const TREASURY = ss58(chainInfo.treasuryAccount)
const PRIME = person(0)
const BRIDGE_EVM = '0x0cd52bf83734f86bf3c1e74b702a816001299e96'
const BRIDGE_HEX = BRIDGE_EVM + 'ee'.repeat(12)

const CASES: [label: string, id: string, acc?: IdentityRef][] = [
    ['treasury', chainInfo.treasuryAccount],
    ['prime with an identity of its own', PRIME.id, PRIME],
    ['network well-known account', BRIDGE_HEX],
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

export const NetworkAccountsScopedToMainnet: Story = {
    render: () => (
        <div className="space-y-4 text-sm">
            <WellKnownProvider treasury={TREASURY} prime="" evmChainId={32026}>
                <div data-testid="mainnet" className="flex flex-wrap items-center gap-6">
                    <AccountLink addr={ss58(BRIDGE_HEX)} />
                    <EvmAddrLink addr={BRIDGE_EVM} full />
                </div>
            </WellKnownProvider>
            <WellKnownProvider treasury={TREASURY} prime="" evmChainId={320261}>
                <div data-testid="testnet" className="flex flex-wrap items-center gap-6">
                    <AccountLink addr={ss58(BRIDGE_HEX)} />
                    <EvmAddrLink addr={BRIDGE_EVM} />
                </div>
            </WellKnownProvider>
        </div>
    ),
    play: async ({canvas, userEvent}) => {
        const mainnet = within(canvas.getByTestId('mainnet'))
        const [ss58Link, evmLink] = mainnet.getAllByRole('link')
        await expect(ss58Link).toHaveTextContent('Hyperlane Bridge')
        await expect(evmLink).toHaveTextContent('Hyperlane Bridge')
        await userEvent.hover(evmLink)
        await expect(await screen.findByRole('tooltip')).toHaveTextContent(BRIDGE_EVM)

        const testnet = within(canvas.getByTestId('testnet'))
        for (const link of testnet.getAllByRole('link')) await expect(link).not.toHaveTextContent('Hyperlane Bridge')
    },
}
