import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {EvmAddrLink} from '@/components/links'
import {evmAddress} from '../../../mock/fixtures/evm.js'
import {AddrMark} from './addrHot'

const meta = {title: 'Components/AddrHot'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const alice = evmAddress(0)
const bob = evmAddress(1)

function Marks() {
    return (
        <div className="space-y-3 text-sm">
            <div className="font-mono text-[13px] text-muted-foreground">
                <AddrMark addr={alice}>{alice}</AddrMark>
            </div>
            {[
                [alice, bob],
                [bob, alice],
                [bob, bob],
            ].map(([from, to], i) => (
                <div key={i} className="flex items-center gap-2">
                    <EvmAddrLink addr={from} />
                    <span className="text-muted-foreground">→</span>
                    <EvmAddrLink addr={to} />
                </div>
            ))}
        </div>
    )
}

export const Idle: Story = {render: () => <Marks />}

export const HoverLightsEveryMatch: Story = {
    render: () => <Marks />,
    play: async ({canvas, userEvent}) => {
        await userEvent.hover(canvas.getByText(alice))
    },
}
