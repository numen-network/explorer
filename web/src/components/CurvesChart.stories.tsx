import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import type {Curve} from '@/lib/curves'
import {HEAD} from '../../../mock/fixtures.js'
import {linear, reciprocal} from '../../../mock/fixtures/governance.js'
import {axesLegible} from '../../.storybook/fit'
import {CurvesChart} from './charts'
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
    tally: [block: number, approval: number, support: number][]
    open: boolean
    confirmations?: [number, number][]
    ended?: number
}

function chart({approval, support, zero, submitted, started, tally, open, confirmations = [], ended}: Spec): Story {
    const toX = (block: number) => Math.min(HOURS, (block - zero) / PER_HOUR)
    const last = tally.at(-1) ?? [0, 0, 0]
    const now = open ? {at: toX(HEAD), approval: last[1], support: last[2]} : null
    const steps = (pick: 1 | 2): [number, number][] => [[toX(submitted), 0], ...tally.map(row => [toX(row[0]), row[pick]] as [number, number]), ...(now ? [[now.at, pick === 1 ? now.approval : now.support] as [number, number]] : [])]
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
        [950_500, 100, 1.14],
        [951_440, 100, 1.14],
        [962_000, 44.1, 1.9],
        [980_000, 59.6, 2.67],
    ],
    open: true,
})

export const ConfirmingEndsEarly = chart({
    ...MEDIUM,
    zero: 961_440,
    submitted: 960_000,
    started: true,
    tally: [
        [960_030, 100, 1.71],
        [960_900, 76.9, 2.86],
        [975_000, 87, 5.71],
        [989_990, 89.5, 7.43],
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
        [700_100, 100, 0.76],
        [715_000, 89.7, 5.71],
        [723_500, 57.8, 5.71],
        [733_000, 77.4, 9.9],
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
        [940_300, 100, 0.95],
        [955_000, 82.4, 2.1],
        [990_000, 87.5, 3.24],
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
        [300_600, 100, 0.76],
        [350_000, 42.9, 1.33],
        [500_000, 27.3, 1.33],
        [543_360, 27.3, 1.33],
    ],
    open: false,
})
