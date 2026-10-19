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

export const StatusChips: Story = {args: {label: 'Usernames', value: '7', chips: chips(['5', 'active', 'pos'], ['1', 'pending', 'idle'], ['1', 'unbinding', 'warn'])}}

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

const figureTops = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card-title]')].map(t => Math.round(t.getBoundingClientRect().top))

const oneLine = (root: HTMLElement) => {
    for (const t of root.querySelectorAll<HTMLElement>('[data-slot=card-title]')) expect(t.getBoundingClientRect().height).toBeLessThanOrEqual(parseFloat(getComputedStyle(t).lineHeight))
}

const IDENTITY_CHIPS = chips(['2', 'verified', 'pos'], ['5', 'unverified', 'idle'], ['0', 'flagged', 'neg'])

export const BesideStat: Story = {
    args: {label: 'Direct identities', value: '7', beside: [{label: 'Sub identities', value: '4'}], chips: IDENTITY_CHIPS},
    decorators: [
        Story => (
            <div className="col-span-full max-w-72">
                <Story />
            </div>
        ),
    ],
    play: async ({canvasElement}) => {
        const [main, beside] = figureTops(canvasElement)
        expect(beside).toBe(main)
        oneLine(canvasElement)
    },
}

// a stat with no room beside the main one drops below it whole
export const BesideStatWrapped: Story = {
    args: {label: 'Direct identities', value: '2,147,483,647', beside: [{label: 'Sub identities', value: '1,000,000'}], chips: IDENTITY_CHIPS},
    decorators: [
        Story => (
            <div className="col-span-full max-w-56">
                <Story />
            </div>
        ),
    ],
    play: all(cardsFit, async ({canvasElement}) => {
        const [main, beside] = figureTops(canvasElement)
        expect(beside).toBeGreaterThan(main)
        oneLine(canvasElement)
    }),
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

// figures share the tile evenly from sm up and stack below it
export const Even: Story = {
    args: {label: 'In lock', value: '700,000 NUMN', beside: [{label: 'Still vesting', value: '520,000 NUMN'}, {label: 'Releasable by vest', value: '180,000 NUMN'}], even: true},
    decorators: [
        Story => (
            <div className="col-span-full">
                <Story />
            </div>
        ),
    ],
    play: all(cardsFit, async ({canvasElement}) => {
        const titles = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card-title]')]
        const tops = new Set(figureTops(canvasElement))
        if (matchMedia('(min-width: 40rem)').matches) {
            expect(tops.size).toBe(1)
            const widths = titles.map(t => t.parentElement!.getBoundingClientRect().width)
            expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
        } else {
            expect(tops.size).toBe(3)
        }
    }),
}

// a multisig's three short figures share one line at every width
export const Row: Story = {
    args: {label: 'Threshold', value: '2 of 3', beside: [{label: 'Pending', value: '1'}, {label: 'Operations', value: '1,024'}], row: true},
    decorators: [
        Story => (
            <div className="col-span-full">
                <Story />
            </div>
        ),
    ],
    play: all(cardsFit, async ({canvasElement}) => {
        expect(new Set(figureTops(canvasElement)).size).toBe(1)
        const widths = [...canvasElement.querySelectorAll<HTMLElement>('[data-slot=card-title]')].map(t => t.parentElement!.getBoundingClientRect().width)
        expect(Math.max(...widths) - Math.min(...widths)).toBeLessThan(1)
    }),
}

// four figures share one line from sm up and sit two to a line below it
export const Pairs: Story = {
    args: {label: 'All votes', value: '12', beside: [{label: 'Active', value: '2'}, {label: 'Participation rate', value: '63.15%'}, {label: 'Total locked', value: '250,000 NUMN'}], pairs: true},
    decorators: [
        Story => (
            <div className="col-span-full">
                <Story />
            </div>
        ),
    ],
    play: all(cardsFit, async ({canvasElement}) => {
        expect(new Set(figureTops(canvasElement)).size).toBe(matchMedia('(min-width: 40rem)').matches ? 1 : 2)
    }),
}
