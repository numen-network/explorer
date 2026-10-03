import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {HEAD, hashOf, squidId} from '../../../mock/fixtures.js'
import {evmTxHash} from '../../../mock/fixtures/blocks.js'
import {BlockLink, EventLink, EvmAddrLink, EvmTxLink, ExtrinsicLink, Jump} from './links'

const meta = {title: 'Components/Links'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[220px_minmax(0,1fr)] items-center gap-4 py-2 text-sm">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div className="min-w-0">{children}</div>
        </div>
    )
}

const ADDRESS = '0x' + hashOf('evm', 1).slice(2, 42)

export const BlockLinks: Story = {
    render: () => (
        <>
            <Case label="genesis">
                <BlockLink height={0} />
            </Case>
            <Case label="head">
                <BlockLink height={HEAD} />
            </Case>
            <Case label="largest height the schema holds">
                <BlockLink height={2_147_483_647} />
            </Case>
        </>
    ),
}

export const ExtrinsicLinks: Story = {
    render: () => (
        <>
            <Case label="first in its block">
                <ExtrinsicLink id={squidId(HEAD, 0)} />
            </Case>
            <Case label="deep in a busy block">
                <ExtrinsicLink id={squidId(4_962, 2_048)} />
            </Case>
            <Case label="id outside the indexer form">
                <ExtrinsicLink id="4962-2" />
            </Case>
        </>
    ),
}

export const EventLinks: Story = {
    render: () => (
        <>
            <Case label="first event of genesis">
                <EventLink height={0} index={0} />
            </Case>
            <Case label="last event of a payout block">
                <EventLink height={HEAD} index={3_693} />
            </Case>
        </>
    ),
}

export const EvmAddressLinks: Story = {
    render: () => (
        <>
            <Case label="short">
                <EvmAddrLink addr={ADDRESS} />
            </Case>
            <Case label="full">
                <EvmAddrLink addr={ADDRESS} full />
            </Case>
        </>
    ),
}

export const EvmTxLinks: Story = {
    render: () => (
        <>
            <Case label="short">
                <EvmTxLink hash={evmTxHash(HEAD)} />
            </Case>
            <Case label="full">
                <EvmTxLink hash={evmTxHash(HEAD)} full />
            </Case>
        </>
    ),
}

export const JumpMark: Story = {
    render: () => (
        <>
            {['text-xs', 'text-sm', 'text-lg'].map(size => (
                <Case key={size} label={size}>
                    <a href="https://numen-network.org" className={`${size} text-primary hover:underline`}>
                        numen-network.org <Jump />
                    </a>
                </Case>
            ))}
        </>
    ),
}
