import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {filterChips} from '../../.storybook/fit'
import {FilterChip, FilterRow, StatusDot} from './pills'

const meta = {title: 'Components/Pills'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

export const FilterChips: Story = {
    render: () => (
        <div className="flex flex-wrap items-center gap-2">
            <FilterChip label="All" href="/extrinsics" active />
            <FilterChip label="Balances" href="/extrinsics?pallet=Balances" active={false} />
            <FilterChip label="Identity" count={0} href="/extrinsics?pallet=Identity" active={false} />
            <FilterChip label="Referenda" count={1} href="/extrinsics?pallet=Referenda" active={false} />
            <FilterChip label="System" count={1_234_567} href="/extrinsics?pallet=System" active={false} />
            <FilterChip label="ConvictionVoting" count={98_765} href="/extrinsics?pallet=ConvictionVoting" active />
        </div>
    ),
}

export const FilterChipsWrapping: Story = {
    render: () => (
        <div className="flex max-w-sm flex-wrap items-center gap-2">
            <FilterChip label="All" href="/governance?tab=referenda" active={false} />
            {['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender'].map((label, i) => (
                <FilterChip key={label} label={label} href={`/governance?tab=referenda&track=${i}`} active={label === 'Medium Spender'} />
            ))}
        </div>
    ),
}

const TRACKS = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']
const href = (v: string) => `?value=${encodeURIComponent(v)}`
const perTrack = (counts: Record<string, number>) => Object.fromEntries(TRACKS.map(t => [t, counts[t] ?? 0]))

export const FilterRowPlain: Story = {
    render: () => <FilterRow label="Direction" values={['out', 'in']} labelOf={d => (d === 'out' ? 'Out' : 'In')} value="" href={href} />,
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Direction')).toEqual(['[All]', 'Out', 'In']),
}

export const FilterRowCounts: Story = {
    render: () => <FilterRow label="Kind" values={['Local', 'Spend']} counts={{Local: 13, Spend: 0}} value="" href={href} />,
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Kind')).toEqual(['[All]', 'Local 13']),
}

export const FilterRowActiveAtZero: Story = {
    render: () => <FilterRow label="Status" values={['Paid', 'Awarded', 'Payment failed']} counts={{Paid: 7, Awarded: 0, 'Payment failed': 0}} value="Payment failed" href={href} />,
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Status')).toEqual(['All', 'Paid 7', '[Payment failed 0]']),
}

export const FilterRowOnlyAll: Story = {
    render: () => <FilterRow label="Kind" values={['Local', 'Spend']} counts={{Local: 0, Spend: 0}} value="" href={href} />,
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Kind')).toEqual(['[All]']),
}

export const FilterRowAllCounted: Story = {
    render: () => <FilterRow label="Track" values={TRACKS} counts={perTrack({'Small Spender': 18, 'Medium Spender': 1_234_567})} allCount={1_234_585} value="" href={href} />,
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Track')).toEqual(['[All 1,234,585]', 'Small Spender 18', 'Medium Spender 1,234,567']),
}

// stacked rows share a label width so their chips line up
export const FilterRowsAligned: Story = {
    render: () => (
        <div className="space-y-2">
            <FilterRow label="Kind" labelClassName="w-12" values={['Local', 'Spend']} counts={{Local: 13, Spend: 34}} value="" href={href} />
            <FilterRow label="Status" labelClassName="w-12" values={['Paid', 'Payment failed']} counts={{Paid: 7, 'Payment failed': 0}} value="Payment failed" href={href} />
            <FilterRow label="Track" labelClassName="w-12" values={TRACKS.slice(6)} counts={{'Small Spender': 2, 'Medium Spender': 3, 'Big Spender': 2}} value="" href={href} />
        </div>
    ),
}

export const FilterRowWrapping: Story = {
    render: () => (
        <div className="max-w-sm">
            <FilterRow label="Track" values={TRACKS} counts={Object.fromEntries(TRACKS.map((t, i) => [t, (i + 1) * 3]))} value="Medium Spender" href={href} />
        </div>
    ),
}

export const StatusDots: Story = {
    render: () => (
        <div className="flex flex-col gap-2 text-xs">
            {(['pos', 'warn', 'neg', 'idle'] as const).map(tone => (
                <span key={tone} className="flex items-center gap-1.5">
                    <StatusDot tone={tone} />
                    {tone}
                </span>
            ))}
        </div>
    ),
}
