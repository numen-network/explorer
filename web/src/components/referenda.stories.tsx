import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import type {Phase} from '@/lib/referendum'
import {Gauge, StatusBadge, TallyBar, ThresholdBar} from './referenda'

const meta = {title: 'Components/Referenda'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const PHASES: Phase[] = ['Submitted', 'Deciding', 'Confirming', 'Approved', 'Rejected', 'Cancelled', 'TimedOut', 'Killed']
const NUMN = 10n ** 18n
const numn = (n: number) => (BigInt(n) * NUMN).toString()

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[180px_minmax(0,320px)] items-center gap-4 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div>{children}</div>
        </div>
    )
}

export const StatusBadges: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {PHASES.map(phase => (
                <StatusBadge key={phase} phase={phase} />
            ))}
        </div>
    ),
}

export const SplitGauge: Story = {
    render: () => (
        <>
            <Case label="no votes">
                <Gauge value={null} variant="split" />
            </Case>
            <Case label="all nay">
                <Gauge value={0} variant="split" />
            </Case>
            <Case label="aye 37%">
                <Gauge value={37} variant="split" />
            </Case>
            <Case label="all aye">
                <Gauge value={100} variant="split" />
            </Case>
            <Case label="aye 62% under a 90% need">
                <Gauge value={62} need={90} variant="split" />
            </Case>
            <Case label="aye 95% over a 90% need">
                <Gauge value={95} need={90} variant="split" />
            </Case>
        </>
    ),
}

export const SolidGauge: Story = {
    render: () => (
        <>
            <Case label="no support">
                <Gauge value={0} variant="solid" />
            </Case>
            <Case label="support 3% under a 4% need">
                <Gauge value={3} need={4} variant="solid" />
            </Case>
            <Case label="support 7% over a 4% need">
                <Gauge value={7} need={4} variant="solid" />
            </Case>
            <Case label="support past 100%">
                <Gauge value={140} need={50} variant="solid" />
            </Case>
        </>
    ),
}

export const ThresholdBars: Story = {
    render: () => (
        <>
            <Case label="approval passing">
                <ThresholdBar label="Approval" variant="split" value={89.5} need={84.1} foot={<span>aye 5.09M</span>} />
            </Case>
            <Case label="approval failing">
                <ThresholdBar label="Approval" variant="split" value={59.6} need={90} />
            </Case>
            <Case label="approval with no votes">
                <ThresholdBar label="Approval" variant="split" value={null} need={100} />
            </Case>
            <Case label="support passing">
                <ThresholdBar label="Support" variant="solid" value={7.4} need={3.6} />
            </Case>
            <Case label="support failing">
                <ThresholdBar label="Support" variant="solid" value={2.7} need={3.9} />
            </Case>
        </>
    ),
}

export const TallyBars: Story = {
    render: () => (
        <>
            <Case label="no votes">
                <TallyBar r={{ayes: '0', nays: '0'}} decimals={18} />
            </Case>
            <Case label="ayes only">
                <TallyBar r={{ayes: numn(3_200_000), nays: '0'}} decimals={18} />
            </Case>
            <Case label="mixed">
                <TallyBar r={{ayes: numn(2_800_000), nays: numn(1_900_000)}} decimals={18} />
            </Case>
            <Case label="nays only">
                <TallyBar r={{ayes: '0', nays: numn(4_100_000)}} decimals={18} />
            </Case>
        </>
    ),
}
