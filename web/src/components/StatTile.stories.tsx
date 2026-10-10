import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {all, cardsFit, type Play} from '../../.storybook/fit'
import {CHAIN} from '../../../mock/fixtures/accounts.js'
import {numn} from '../../../mock/fixtures.js'
import Approx from './Approx'
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

const chips = (...list: [text: StatChip['text'], note: string, tone: StatChip['tone']][]): StatChip[] => list.map(([text, note, tone]) => ({text, note, tone}))

export const Plain: Story = {}

export const Linked: Story = {args: {label: 'Signed extrinsics', value: '89,062', href: '/charts/extrinsics-total'}}

export const RisingChips: Story = {args: {label: 'Transfers', value: '30,411', href: '/charts/transfers-total', chips: chips(['+401', '24h', 'pos'], ['+11.4K', '30d', 'pos'])}}

export const FallingChips: Story = {
    args: {
        label: 'Treasury pot',
        value: <Approx planck={numn(549_923_456)} decimals={CHAIN.decimals} symbol={CHAIN.symbol} />,
        href: '/charts/treasury',
        chips: chips([<Approx planck={`-${numn(528.4012)}`} decimals={CHAIN.decimals} move />, '24h', 'neg'], [<Approx planck={`-${numn(70_000)}`} decimals={CHAIN.decimals} move />, '30d', 'neg']),
    },
}

export const MixedPercentChips: Story = {args: {label: 'Difficulty', value: '5.11B', href: '/charts/difficulty', chips: chips(['−0.21%', '24h', 'neg'], ['+5.83%', '30d', 'pos'])}}

export const IdleChips: Story = {args: {label: 'Difficulty', value: '3.68B', href: '/charts/difficulty', chips: chips(['0.00%', '24h', 'idle'], ['—', '30d', 'idle'])}}

export const CountChips: Story = {args: {label: 'Miners', value: '23', href: '/charts/miners', chips: chips(['43', '30d', 'idle'], ['54', 'total', 'idle'])}}

export const ZeroValue: Story = {args: {label: 'EVM txs', value: '0', href: '/charts/evm-transactions', chips: chips(['0', '24h', 'idle'], ['0', '30d', 'idle'])}}

export const NoValue: Story = {args: {label: 'Difficulty', value: '—', href: '/charts/difficulty', chips: chips(['—', '24h', 'idle'], ['—', '30d', 'idle'])}}

// a figure too long for the tile wraps between its digit groups, never inside one
const groupsWhole: Play = async ({canvasElement}) => {
    const groups = [...canvasElement.querySelector('[data-slot=card-title]')!.childNodes].filter(node => node.nodeType === Node.TEXT_NODE && /^\d+$/.test(node.textContent!))
    expect(groups.length).toBeGreaterThan(1)
    for (const group of groups) {
        const range = document.createRange()
        range.selectNodeContents(group)
        expect({group: group.textContent, lines: new Set([...range.getClientRects()].map(r => Math.round(r.top))).size}).toEqual({group: group.textContent, lines: 1})
    }
}

export const LongValue: Story = {
    args: {label: 'Total supply', value: <Approx planck={((1n << 256n) - 1n).toString()} decimals={18} symbol="TEST" breakable />},
    play: all(cardsFit, groupsWhole),
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
