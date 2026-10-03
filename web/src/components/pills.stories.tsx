import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {FilterChip, StatusDot} from './pills'

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
