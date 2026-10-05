import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import type {Curve} from '@/lib/curves'
import type {Share} from '@/lib/format'
import {HEAD} from '../../../mock/fixtures.js'
import {linear, reciprocal} from '../../../mock/fixtures/governance.js'
import {axesLegible, lastTooltipLines, PHONE, tooltipsInView} from '../../.storybook/fit'
import {CurvesChart, type TallyStep} from './charts'
import {Card} from './ui/card'

const meta = {title: 'Components/CurvesChart'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const HOURS = 672
const PER_HOUR = 360
const BLOCK_TIME = 10

interface Spec {
    approval: object
    support: object
    zero: number
    submitted: number
    started: boolean
    tally: [block: number, approval: Share, support: Share][]
    open: boolean
    confirmations?: [number, number][]
    ended?: number
}

// a percentage as a share of ten thousand, so 44.1 reads 44.10%
const pct = (n: number): Share => [BigInt(Math.round(n * 100)), 10_000n]

const EMPTY: Share = [0n, 1n]

function chart({approval, support, zero, submitted, started, tally, open, confirmations = [], ended}: Spec): Story {
    const toX = (block: number) => Math.min(HOURS, (block - zero) / PER_HOUR)
    const last: Spec['tally'][number] = tally.at(-1) ?? [0, EMPTY, EMPTY]
    const now = open ? {at: toX(HEAD)} : null
    const steps = (pick: 1 | 2): TallyStep[] => [[toX(submitted), EMPTY], ...tally.map((row): TallyStep => [toX(row[0]), row[pick]]), ...(now ? [[now.at, last[pick]] as TallyStep] : [])]
    const windows = confirmations.map(([from, to]) => [toX(from), toX(to)] as [number, number])
    const end = ended !== undefined ? toX(ended) : open ? windows.at(-1)?.[1] : undefined
    return {
        render: () => (
            <Card size="flush" className="px-5 py-4">
                <CurvesChart
                    approval={approval as Curve}
                    support={support as Curve}
                    currentApproval={steps(1)}
                    currentSupport={steps(2)}
                    now={now}
                    confirmations={windows}
                    earlyEnd={end !== undefined && end < HOURS ? end : null}
                    hours={HOURS}
                    clock={{zero, perHour: PER_HOUR, blockTime: BLOCK_TIME, started}}
                    lead={{from: toX(submitted), submitted}}
                />
            </Card>
        ),
        play: axesLegible,
    }
}

const SMALL = {approval: linear(25e7, 5e8, 1e9), support: reciprocal('3846922', '7712083', '1182519')}
const MEDIUM = {approval: linear(5e8, 5e8, 1e9), support: reciprocal('5846821', '11734029', '1720990')}
const BIG = {approval: linear(1e9, 5e8, 1e9), support: reciprocal('7901235', '15873016', '2222222')}

export const DecidingBelowCurves = chart({
    ...BIG,
    zero: 951_440,
    submitted: 950_000,
    started: true,
    tally: [
        [950_500, pct(100), pct(1.14)],
        [951_440, pct(100), pct(1.14)],
        [962_000, pct(44.1), pct(1.9)],
        [980_000, pct(59.6), pct(2.67)],
    ],
    open: true,
})

export const ConfirmingEndsEarly = chart({
    ...MEDIUM,
    zero: 961_440,
    submitted: 960_000,
    started: true,
    tally: [
        [960_030, pct(100), pct(1.71)],
        [960_900, pct(76.9), pct(2.86)],
        [975_000, pct(87), pct(5.71)],
        [989_990, pct(89.5), pct(7.43)],
    ],
    open: true,
    confirmations: [[990_000, 1_015_920]],
})

export const TwoConfirmationsEndedEarly = chart({
    ...SMALL,
    zero: 701_440,
    submitted: 700_000,
    started: true,
    tally: [
        [700_100, pct(100), pct(0.76)],
        [715_000, pct(89.7), pct(5.71)],
        [723_500, pct(57.8), pct(5.71)],
        [733_000, pct(77.4), pct(9.9)],
    ],
    open: false,
    confirmations: [
        [720_000, 724_000],
        [735_000, 743_640],
    ],
    ended: 743_640,
})

export const WaitingForDecisionDeposit = chart({
    ...MEDIUM,
    zero: HEAD,
    submitted: 940_000,
    started: false,
    tally: [
        [940_300, pct(100), pct(0.95)],
        [955_000, pct(82.4), pct(2.1)],
        [990_000, pct(87.5), pct(3.24)],
    ],
    open: true,
})

export const NoVotesYet = chart({...SMALL, zero: 1_000_840, submitted: 999_400, started: false, tally: [], open: true})

export const RejectedAtEndOfPeriod = chart({
    ...MEDIUM,
    zero: 301_440,
    submitted: 300_000,
    started: true,
    tally: [
        [300_600, pct(100), pct(0.76)],
        [350_000, pct(42.9), pct(1.33)],
        [500_000, pct(27.3), pct(1.33)],
        [543_360, pct(27.3), pct(1.33)],
    ],
    open: false,
})

// the tally runs to the end of the period, so readings list all four lines
export const RejectedAtEndOfPeriodTooltipOnPhone: Story = {...RejectedAtEndOfPeriod, globals: PHONE, play: tooltipsInView}

const AYES = 52_000_000n * 10n ** 18n

// one planck of nay against 52M of aye keeps the reading short of 100%
export const SliverOfNay: Story = {
    ...chart({
        ...MEDIUM,
        zero: 961_440,
        submitted: 960_000,
        started: true,
        tally: [
            [960_030, [AYES, AYES], pct(99.01)],
            [975_000, [AYES, AYES + 1n], pct(99.01)],
        ],
        open: true,
    }),
    play: async context => {
        await axesLegible!(context)
        expect(lastTooltipLines(context.canvasElement, 'Current approval')[0]).toContain('Current approval99.99%')
    },
}
