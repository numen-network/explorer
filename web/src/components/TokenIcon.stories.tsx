import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {WellKnownProvider} from '@/components/wellKnown'
import {chainInfo} from '../../../mock/fixtures.js'
import {token, WTMR} from '../../../mock/fixtures/evm.js'
import TokenIcon from './TokenIcon'

const meta = {title: 'Components/TokenIcon'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

// the icon is sized in em, so each line shows it against a different text size
function Lines({chainId, addr, label}: {chainId: number; addr: string; label: string}) {
    return (
        <WellKnownProvider treasury="" prime="" evmChainId={chainId}>
            {['text-xs', 'text-sm', 'text-lg font-semibold'].map(size => (
                <div key={size} className={`${size} py-1`}>
                    <TokenIcon addr={addr} />
                    {label}
                </div>
            ))}
        </WellKnownProvider>
    )
}

export const KnownLogo: Story = {
    render: () => <Lines chainId={chainInfo.evmChainId} addr={WTMR.id} label={WTMR.name} />,
}

export const NoLogo: Story = {
    render: () => <Lines chainId={chainInfo.evmChainId} addr={token(0).id} label={token(0).name} />,
}

export const KnownAddressOnOtherChain: Story = {
    render: () => <Lines chainId={1} addr={WTMR.id} label={WTMR.name} />,
}
