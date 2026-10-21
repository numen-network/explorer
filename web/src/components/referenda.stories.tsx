import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {ReactNode} from 'react'
import {expect} from 'storybook/test'
import type {ReferendumRow} from '@/lib/gql'
import type {Phase} from '@/lib/referendum'
import {referenda} from '../../../mock/data.js'
import {CHAIN} from '../../../mock/fixtures/accounts.js'
import {at, person} from '../../../mock/fixtures.js'
import {Gauge, ReferendumByline, StatusBadge, StatusTag, ThresholdBar} from './referenda'

const meta = {title: 'Components/Referenda'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const PHASES: Phase[] = ['Submitted', 'Deciding', 'Confirming', 'Approved', 'Rejected', 'Cancelled', 'TimedOut', 'Killed']
const NUMN = 10n ** 18n

function Case({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="grid grid-cols-[180px_minmax(0,320px)] items-center gap-4 py-2">
            <span className="text-xs text-muted-foreground">{label}</span>
            <div>{children}</div>
        </div>
    )
}

export const EveryPhase: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {PHASES.map(phase => (
                <StatusBadge key={phase} phase={phase} />
            ))}
        </div>
    ),
}

// the soft form a table row shows
export const EveryPhaseTag: Story = {
    render: () => (
        <div className="flex flex-wrap gap-2">
            {PHASES.map(phase => (
                <StatusTag key={phase} phase={phase} />
            ))}
        </div>
    ),
}

// the byline reads the submitter, the track, the submission time and the phase
const REFERENDUM: ReferendumRow = {
    id: '10',
    index: 10,
    origin: null,
    proposalHash: null,
    title: null,
    description: null,
    proposalPallet: null,
    proposalMethod: null,
    proposalPayouts: null,
    proposalAmount: null,
    proposalBeneficiary: null,
    submittedAt: 600_000,
    submittedTimestamp: at(600_000),
    status: 'Approved',
    decidingSince: 669_000,
    confirmingSince: 690_000,
    endedAt: 698_640,
    ayes: '0',
    nays: '0',
    support: '0',
    timeline: null,
    submitter: person(0),
    track: referenda[1].track,
}

export const BylineWithSubmitter: Story = {
    render: () => <ReferendumByline r={REFERENDUM} chain={CHAIN} />,
    play: async ({canvasElement}) => expect(canvasElement.querySelector('a[href^="/account/"]')).toHaveTextContent('Polaris Guild'),
}

export const BylineWithoutSubmitter: Story = {
    render: () => <ReferendumByline r={{...REFERENDUM, submitter: null}} chain={CHAIN} />,
    play: async ({canvas, canvasElement}) => {
        await expect(canvasElement.querySelector('a[href^="/account/"]')).toBeNull()
        await expect(canvas.getByText('—')).toBeInTheDocument()
    },
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

// a figure reads green once it meets its need, red short of it, and grey with nothing to measure
export const EveryThresholdOutcome: Story = {
    render: () => (
        <>
            <Case label="approval passing">
                <ThresholdBar label="Approval" variant="split" part={895n} whole={1000n} need={84.1} foot={<span>aye 5.09M</span>} />
            </Case>
            <Case label="approval failing">
                <ThresholdBar label="Approval" variant="split" part={596n} whole={1000n} need={90} />
            </Case>
            <Case label="approval with no votes">
                <ThresholdBar label="Approval" variant="split" part={0n} whole={0n} need={100} />
            </Case>
            <Case label="approval one planck short of all">
                <ThresholdBar label="Approval" variant="split" part={3_200_000n * NUMN - 1n} whole={3_200_000n * NUMN} need={84.1} />
            </Case>
            <Case label="support passing">
                <ThresholdBar label="Support" variant="solid" part={74n} whole={1000n} need={3.6} />
            </Case>
            <Case label="support failing">
                <ThresholdBar label="Support" variant="solid" part={27n} whole={1000n} need={3.9} />
            </Case>
            <Case label="support a sliver of issuance">
                <ThresholdBar label="Support" variant="solid" part={5n * NUMN} whole={52_000_000n * NUMN} need={0.5} />
            </Case>
            <Case label="support with no issuance read">
                <ThresholdBar label="Support" variant="solid" part={0n} whole={0n} need={0.5} />
            </Case>
        </>
    ),
    play: async ({canvas}) => {
        const figures = canvas.getAllByText(/^need /).map(need => need.parentElement!)
        await expect(figures.map(figure => figure.textContent)).toEqual([
            '89.50% need 84.10%',
            '59.60% need 90.00%',
            '— need 100.00%',
            '99.99% need 84.10%',
            '7.40% need 3.60%',
            '2.70% need 3.90%',
            '<0.01% need 0.50%',
            '— need 0.50%',
        ])
        await expect(figures.map(figure => figure.firstElementChild!.className)).toEqual([
            'text-good',
            'text-destructive',
            'text-muted-foreground',
            'text-good',
            'text-good',
            'text-destructive',
            'text-destructive',
            'text-muted-foreground',
        ])
    },
}
