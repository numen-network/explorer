import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {cardsFit} from '../../.storybook/fit'
import StatTile, {type StatChip} from './StatTile'

const meta = {
    title: 'Components/StatTile',
    component: StatTile,
    args: {label: 'Referenda', value: '12'},
    // the home page grid, so a tile takes the width it gets there
    decorators: [
        Story => (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
                <Story />
            </div>
        ),
    ],
} satisfies Meta<typeof StatTile>
export default meta
type Story = StoryObj<typeof meta>

const chips = (...list: [text: string, note: string, tone: StatChip['tone']][]): StatChip[] => list.map(([text, note, tone]) => ({text, note, tone}))

export const Plain: Story = {}

export const Linked: Story = {args: {label: 'Signed extrinsics', value: '89,062', href: '/charts/extrinsics-total'}}

export const RisingChips: Story = {args: {label: 'Transfers', value: '30,411', href: '/charts/transfers-total', chips: chips(['+401', '24h', 'pos'], ['+11.4K', '30d', 'pos'])}}

export const FallingChips: Story = {args: {label: 'Treasury pot', value: '≈549.92M NUMN', href: '/charts/treasury', chips: chips(['≈−528.4', '24h', 'neg'], ['−70K', '30d', 'neg'])}}

export const MixedPercentChips: Story = {args: {label: 'Difficulty', value: '5.11B', href: '/charts/difficulty', chips: chips(['−0.21%', '24h', 'neg'], ['+5.83%', '30d', 'pos'])}}

export const IdleChips: Story = {args: {label: 'Difficulty', value: '3.68B', href: '/charts/difficulty', chips: chips(['0.00%', '24h', 'idle'], ['—', '30d', 'idle'])}}

export const CountChips: Story = {args: {label: 'Miners', value: '23', href: '/charts/miners', chips: chips(['43', '30d', 'idle'], ['54', 'total', 'idle'])}}

export const ZeroValue: Story = {args: {label: 'EVM txs', value: '0', href: '/charts/evm-transactions', chips: chips(['0', '24h', 'idle'], ['0', '30d', 'idle'])}}

export const NoValue: Story = {args: {label: 'Difficulty', value: '—', href: '/charts/difficulty', chips: chips(['—', '24h', 'idle'], ['—', '30d', 'idle'])}}

export const LongValue: Story = {
    args: {label: 'Total supply', value: '≈115,792,089,237,316,195,423,570,985,008,687,907.85Y TEST'},
    play: cardsFit,
}

export const HomeRow: Story = {
    render: () => (
        <>
            <StatTile label="Signed extrinsics" href="/charts/extrinsics-total" value="89,062" chips={chips(['+1,139', '24h', 'pos'], ['+33.6K', '30d', 'pos'])} />
            <StatTile label="Transfers" href="/charts/transfers-total" value="30,411" chips={chips(['+401', '24h', 'pos'], ['+11.4K', '30d', 'pos'])} />
            <StatTile label="EVM txs" href="/charts/evm-transactions" value="3,620" chips={chips(['0', '24h', 'idle'], ['+1,439', '30d', 'pos'])} />
            <StatTile label="Accounts" href="/charts/accounts" value="1,636" chips={chips(['+2', '24h', 'pos'], ['+410', '30d', 'pos'])} />
            <StatTile label="Miners" href="/charts/miners" value="23" chips={chips(['43', '30d', 'idle'], ['54', 'total', 'idle'])} />
        </>
    ),
}
