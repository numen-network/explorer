import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, screen, waitFor, within} from 'storybook/test'
import {expectInContentBox, filterChips, filterOptions} from '../../.storybook/fit'
import {FilterChip, FilterRow, FilterSelect, StatusDot} from './pills'

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

export const FilterSelectPlain: Story = {
    render: () => <FilterSelect label="Track" values={TRACKS} value="" href={href} />,
    play: async ({canvasElement}) => expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All]', ...TRACKS]),
}

export const FilterSelectCounts: Story = {
    render: () => <FilterSelect label="Kind" values={['Local', 'Spend']} counts={{Local: 13, Spend: 0}} value="" href={href} />,
    play: async ({canvasElement}) => expect(await filterOptions(canvasElement, 'Kind')).toEqual(['[All]', 'Local 13', 'Spend 0']),
}

// a value the counts leave out counts 0
export const FilterSelectActiveAtZero: Story = {
    render: () => <FilterSelect label="Status" values={['Paid', 'Awarded', 'Payment failed']} counts={{Paid: 7}} value="Payment failed" href={href} />,
    play: async ({canvasElement}) => expect(await filterOptions(canvasElement, 'Status')).toEqual(['All', 'Paid 7', 'Awarded 0', '[Payment failed 0]']),
}

export const FilterSelectAllCounted: Story = {
    render: () => <FilterSelect label="Track" values={TRACKS} counts={perTrack({'Small Spender': 18, 'Medium Spender': 1_234_567})} allCount={1_234_585} value="" href={href} />,
    play: async ({canvasElement}) =>
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All 1,234,585]', 'Root 0', 'Runtime Upgrade 0', 'Wish For Change 0', 'Identity Admin 0', 'Referendum Canceller 0', 'Referendum Killer 0', 'Small Spender 18', 'Medium Spender 1,234,567', 'Big Spender 0']),
}

export const FilterSelectOpen: Story = {
    render: () => <FilterSelect label="Track" values={TRACKS} counts={perTrack({'Small Spender': 18, 'Medium Spender': 15, 'Big Spender': 12})} allCount={45} value="Medium Spender" href={href} />,
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('combobox', {name: 'Track'}))
        await waitFor(() => expect(screen.getByRole('option', {name: /^Medium Spender/, selected: true})).toBeVisible())
    },
}

const triggerWidths = (root: HTMLElement) => within(root).getAllByRole('combobox').map(trigger => trigger.getBoundingClientRect().width)

// the trigger is as wide as its longest label whichever value is picked
export const FilterSelectSteadyWidth: Story = {
    render: () => (
        <div className="space-y-2">
            <FilterSelect label="Track" values={TRACKS} value="" href={href} />
            <FilterSelect label="Track" values={TRACKS} value="Referendum Canceller" href={href} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const [all, longest] = triggerWidths(canvasElement)
        await expect(all).toBe(longest)
    },
}

const METHODS = ['set', 'place_decision_deposit', 'refund_submission_deposit']

// fit holds labels beyond the values on offer, selects over different values keep one width
export const FilterSelectFit: Story = {
    render: () => (
        <div className="space-y-2">
            <FilterSelect label="Method" values={METHODS.slice(0, 1)} value="" href={href} fit={METHODS} />
            <FilterSelect label="Method" values={METHODS.slice(1)} value="refund_submission_deposit" href={href} fit={METHODS} />
        </div>
    ),
    play: async ({canvasElement}) => {
        const [short, long] = triggerWidths(canvasElement)
        await expect(short).toBe(long)
    },
}

// a box narrower than the longest label squeezes the trigger, the label cut short
export const FilterSelectNarrow: Story = {
    render: () => (
        <div className="max-w-48">
            <FilterSelect label="Method" values={METHODS} value="refund_submission_deposit" href={href} />
        </div>
    ),
    play: async ({canvas}) => {
        const trigger = canvas.getByRole('combobox', {name: 'Method'})
        expectInContentBox(trigger.parentElement!, trigger)
    },
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
