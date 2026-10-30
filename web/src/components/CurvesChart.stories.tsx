import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, userEvent, waitFor, within} from 'storybook/test'
import type {CurveVoter} from '@/lib/curveVoters'
import type {Curve} from '@/lib/curves'
import type {Share} from '@/lib/format'
import {HEAD} from '../../../mock/fixtures.js'
import {linear, reciprocal} from '../../../mock/fixtures/governance.js'
import {GREEN, RED, tint} from '@/lib/chartColors'
import {axesLegible, filledSpans, lastTooltipLines, legendsIn, tooltipsInView, unselectLegend, yPixel} from '../../.storybook/fit'
import {CurvesChart, type TallyStep, type VoteStep} from './charts'
import {Card} from './ui/card'

const meta = {title: 'Pages/Referendum/Curves'} satisfies Meta
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
    voters?: CurveVoter[]
}

// a percentage as a share of ten thousand, so 44.1 reads 44.10%
const pct = (n: number): Share => [BigInt(Math.round(n * 100)), 10_000n]

const EMPTY: Share = [0n, 1n]

const ISSUANCE = 1_000_000_000n * 10n ** 18n

// the turnout a support share stands for, split by the approval share
const ayeNay = ([part, whole]: Share, [backing, active]: Share): [bigint, bigint] => {
    const turnout = (ISSUANCE * backing) / active
    return [(turnout * part) / whole, turnout - (turnout * part) / whole]
}

function chart({approval, support, zero, submitted, started, tally, open, confirmations = [], ended, voters = []}: Spec): Story {
    const toX = (block: number) => Math.min(HOURS, (block - zero) / PER_HOUR)
    const last: Spec['tally'][number] = tally.at(-1) ?? [0, EMPTY, EMPTY]
    const now = open ? {at: toX(HEAD)} : null
    const steps = (pick: 1 | 2): TallyStep[] => [[toX(submitted), EMPTY], ...tally.map((row): TallyStep => [toX(row[0]), row[pick]]), ...(now ? [[now.at, last[pick]] as TallyStep] : [])]
    const currentVotes: VoteStep[] = [[toX(submitted), 0n, 0n], ...tally.map((row): VoteStep => [toX(row[0]), ...ayeNay(row[1], row[2])]), ...(now ? [[now.at, ...ayeNay(last[1], last[2])] as VoteStep] : [])]
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
                    currentVotes={currentVotes}
                    voters={voters}
                    unit={{decimals: 18, symbol: 'NUMN'}}
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

export const ChartDecidingBelowCurves = chart({
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

export const ChartConfirmingEndsEarly = chart({
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

export const ChartTwoConfirmAttempts = chart({
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

export const ChartWaitingForDecisionDeposit = chart({
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

export const ChartSubmittedWithoutVotes = chart({...SMALL, zero: 1_000_840, submitted: 999_400, started: false, tally: [], open: true})

export const ChartRejectedAtEnd = chart({
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

// the tally runs to the end of the period, so the readings there list all
// four lines, and a tooltip stays in view wherever it opens
export const ChartRejectedAtEndTooltip: Story = {
    ...ChartRejectedAtEnd,
    play: async context => {
        await tooltipsInView(context)
        const [, ...readings] = lastTooltipLines(context.canvasElement)[0]
        expect(readings.map(line => line!.replace(/[\d.]+%$/, ''))).toEqual(['Approval', 'Current approval', 'Support', 'Current support'])
    },
}

const AYES = 52_000_000n * 10n ** 18n

// one planck of nay against 52M of aye keeps the reading short of 100%
export const ChartExtremeAmounts: Story = {
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
        await axesLegible(context)
        expect(lastTooltipLines(context.canvasElement, 'Current approval')[0]).toContain('Current approval99.99%')
    },
}

// the switch draws the aye and nay totals under the curves, on an axis of their own
export const ChartAyeNayValue: Story = {
    ...ChartDecidingBelowCurves,
    play: async context => {
        await userEvent.click(within(context.canvasElement).getByRole('switch', {name: 'Aye/Nay Value'}))
        await axesLegible(context)
        await waitFor(() => expect(legendsIn(context.canvasElement)[0]).toEqual(['Approval', 'Current approval', 'Support', 'Current support', 'Aye', 'Nay']))
        const [, ...readings] = lastTooltipLines(context.canvasElement, 'Aye')[0]
        expect(readings.slice(4)).toEqual(['Aye≈15.91M NUMN', 'Nay≈10.78M NUMN'])
    },
}

const AYE_FILL = tint(GREEN, 0.3)
const NAY_FILL = tint(RED, 0.3)

const showVotes = (root: HTMLElement) => userEvent.click(within(root).getByRole('switch', {name: 'Aye/Nay Value'}))

// the topmost and bottommost pixel an area reaches, the bottom first
const reach = (root: HTMLElement, fill: string) => {
    const spans = filledSpans(root, fill)[0]
    expect(spans.length).toBeGreaterThan(0)
    return [Math.max(...spans.map(([, bottom]) => bottom)), Math.min(...spans.map(([top]) => top))]
}

// the pixel where the votes axis puts a total in whole NUMN
const votesAt = (root: HTMLElement, numn: number) => yPixel(root, 1, numn)

// the nay area falls back to its own highest total, 10.79M at the last step, not the 26.7M turnout
export const ChartAyeNayValueAyeHidden: Story = {
    ...ChartDecidingBelowCurves,
    play: async ({canvasElement}) => {
        await showVotes(canvasElement)
        unselectLegend(canvasElement, 'Aye')
        await waitFor(() => {
            const [bottom, top] = reach(canvasElement, NAY_FILL)
            expect(bottom).toBeCloseTo(votesAt(canvasElement, 0), 0)
            expect(top).toBeCloseTo(votesAt(canvasElement, 10_786_800), 0)
        })
    },
}

// the aye area keeps its highest total, 15.91M at the last step
export const ChartAyeNayValueNayHidden: Story = {
    ...ChartDecidingBelowCurves,
    play: async ({canvasElement}) => {
        await showVotes(canvasElement)
        unselectLegend(canvasElement, 'Nay')
        await waitFor(() => {
            const [bottom, top] = reach(canvasElement, AYE_FILL)
            expect(bottom).toBeCloseTo(votesAt(canvasElement, 0), 0)
            expect(top).toBeCloseTo(votesAt(canvasElement, 15_913_200), 0)
        })
    },
}

const UNOPPOSED = chart({
    ...MEDIUM,
    zero: 951_440,
    submitted: 950_000,
    started: true,
    tally: [
        [950_500, pct(100), pct(0.45)],
        [951_000, pct(100), pct(0.68)],
        [955_000, pct(100), pct(1.78)],
    ],
    open: true,
})

// the canvas pixels inside the plot where red outweighs green and blue
const reddish = (root: HTMLElement) => {
    const canvas = root.querySelector('canvas')!
    const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('[_echarts_instance_]')!)!
    const bottom = Math.floor(yPixel(root, 0, 0) * chart.getDevicePixelRatio())
    const {data} = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, bottom)
    let count = 0
    for (let i = 0; i < data.length; i += 4) if (data[i] > data[i + 1] + 12 && data[i] > data[i + 2] + 12) count++
    return count
}

// nobody voted nay, so with the aye area hidden nothing stands above the axis
export const ChartAyeNayValueAyeHiddenNoNays: Story = {
    ...UNOPPOSED,
    play: async ({canvasElement}) => {
        await showVotes(canvasElement)
        unselectLegend(canvasElement, 'Aye')
        await waitFor(() => expect(filledSpans(canvasElement, NAY_FILL)[0].filter(([top, bottom]) => bottom > top)).toEqual([]))
        expect(reddish(canvasElement)).toBe(0)
    },
}

// referendum 0's aye totals, every vote an aye, with sub-pixel swings just before hour zero
export const ChartAyeNaySpike: Story = {
    ...chart({
        ...BIG,
        zero: 85_205,
        submitted: 16_748,
        started: true,
        tally: (
            [
                [16_811, 1_620],
                [16_814, 1_600],
                [16_851, 1_680],
                [17_110, 80],
                [36_966, 83_190],
                [36_996, 2_207_190],
                [80_463, 2_207_191],
                [82_146, 3_274_568],
                [85_081, 1_150_568],
                [85_160, 11_765_568],
                [85_164, 7_450_568],
                [85_175, 1_150_568],
                [85_184, 7_519_568],
                [85_205, 7_519_568],
                [85_224, 7_529_568],
                [85_230, 7_529_573],
                [85_848, 8_529_573],
                [85_861, 8_529_573],
                [90_740, 8_531_673],
                [90_768, 8_530_773],
                [117_565, 8_560_773],
                [136_138, 8_560_774],
                [165_541, 8_560_774],
            ] as const
        ).map(([block, ayes]): Spec['tally'][number] => [block, [1n, 1n], [BigInt(ayes) * 10n ** 18n, ISSUANCE]]),
        open: false,
    }),
    play: async ({canvasElement}) => {
        await showVotes(canvasElement)
        const chart = echarts.getInstanceByDom(canvasElement.querySelector<HTMLElement>('[_echarts_instance_]')!)!
        await waitFor(() => expect(legendsIn(canvasElement)[0]).toContain('Nay'))
        expect(lastTooltipLines(canvasElement, 'Aye')[0]).toContain('Nay0 NUMN')
        chart.dispatchAction({type: 'dataZoom', startValue: -54, endValue: 60})
        await waitFor(() => expect(chart.getOption().dataZoom).toMatchObject([{startValue: -54}, {startValue: -54}]))
        await new Promise(settled => setTimeout(settled, 1500))
        expect(reddish(canvasElement)).toBe(0)
    },
}

// every vote is a nay. the aye area stays flat, the nay area runs from the axis to the 11.4M turnout
export const ChartAyeNayValueNoAyes: Story = {
    ...chart({
        ...MEDIUM,
        zero: 301_440,
        submitted: 300_000,
        started: true,
        tally: [
            [300_600, pct(0), pct(0.38)],
            [350_000, pct(0), pct(1.14)],
        ],
        open: false,
    }),
    play: async ({canvasElement}) => {
        await showVotes(canvasElement)
        await waitFor(() => {
            const [ayeBottom, ayeTop] = reach(canvasElement, AYE_FILL)
            expect(ayeTop).toBeCloseTo(ayeBottom, 0)
            const [nayBottom, nayTop] = reach(canvasElement, NAY_FILL)
            expect(nayBottom).toBeCloseTo(votesAt(canvasElement, 0), 0)
            expect(nayTop).toBeCloseTo(votesAt(canvasElement, 11_400_000), 0)
        })
        const [, ...readings] = lastTooltipLines(canvasElement, 'Aye')[0]
        expect(readings.slice(4)).toEqual(['Aye0 NUMN', 'Nay11.4M NUMN'])
    },
}

// no votes yet, the aye area lies flat on the axis, no nay area shows, and the axes stay legible
export const ChartAyeNayValueNoVotes: Story = {
    ...ChartSubmittedWithoutVotes,
    play: async context => {
        await showVotes(context.canvasElement)
        await axesLegible(context)
        const [bottom, top] = reach(context.canvasElement, AYE_FILL)
        expect(top).toBeCloseTo(bottom, 0)
        expect(reddish(context.canvasElement)).toBe(0)
    },
}

const voter = (seed: string, block: number, approval: number, moved: number, crossed: CurveVoter['crossed'], impact: boolean, decision = 'aye'): CurveVoter => ({
    hex: `0x${seed.repeat(64).slice(0, 64)}`,
    hour: (block - 951_440) / PER_HOUR,
    approval,
    moved,
    crossed,
    row: {
        id: `${seed}-${block}`,
        block,
        iso: '2026-10-01T00:00:00.000Z',
        actor: {addr: `5${seed.repeat(47).slice(0, 47)}`, acc: {id: `0x${seed}`, identityDisplay: `Voter ${seed}`} as never},
        own: '0',
        delegated: '0',
        impact: impact ? {approval: pct(moved), support: pct(moved / 2)} : undefined,
        kind: 'vote',
        decision,
    },
})

const voterSizes = (root: HTMLElement) => dataOf(root).map(d => d.symbolSize)
const dataOf = (root: HTMLElement) => {
    const chart = echarts.getInstanceByDom(root.querySelector<HTMLElement>('[_echarts_instance_]')!)!
    const series = chart.getOption().series as {name: string; data: {symbolSize: number}[]}[]
    return series.find(s => s.name === 'Voters')!.data
}

const showVoters = (root: HTMLElement) => userEvent.click(within(root).getByRole('switch', {name: 'Show Voters'}))

const VOTER_TALLY = {
    ...BIG,
    zero: 951_440,
    submitted: 950_000,
    started: true,
    tally: [
        [950_500, pct(100), pct(1.14)],
        [951_440, pct(100), pct(1.14)],
        [962_000, pct(44.1), pct(1.9)],
        [980_000, pct(59.6), pct(2.67)],
    ] as Spec['tally'],
    open: true,
}

// the biggest move takes the largest dot
export const ChartShowVoters: Story = {
    ...chart({...VOTER_TALLY, voters: [voter('a', 950_500, 100, 100, null, true), voter('b', 962_000, 44.1, 25, null, true, 'nay'), voter('c', 980_000, 59.6, 0, null, true)]}),
    play: async context => {
        await showVoters(context.canvasElement)
        await axesLegible(context)
        await waitFor(() => expect(voterSizes(context.canvasElement)).toEqual([28, 23, 18]))
        const series = echarts.getInstanceByDom(context.canvasElement.querySelector<HTMLElement>('[_echarts_instance_]')!)!.getOption().series as {name: string; itemStyle?: {opacity: number}}[]
        expect(series.find(s => s.name === 'Voters')!.itemStyle!.opacity).toBe(1)
    },
}

export const ChartShowVotersOff: Story = {
    ...ChartShowVoters,
    play: async ({canvasElement}) => {
        await expect(within(canvasElement).getByRole('switch', {name: 'Show Voters'})).not.toBeChecked()
        await waitFor(() => expect(dataOf(canvasElement)).toEqual([]))
    },
}

// a voter's name renders as text, a crossing dot keeps its min size
export const ChartVoterCrossedUp: Story = {
    ...chart({...VOTER_TALLY, voters: [voter('a', 950_500, 100, 100, null, true), voter('<b>', 980_000, 59.6, 1, 'up', true)]}),
    play: async ({canvasElement}) => {
        await showVoters(canvasElement)
        await waitFor(() => expect(voterSizes(canvasElement)).toEqual([28, 22]))
        const lines = lastTooltipLines(canvasElement, 'Voters')[0].join(' ')
        expect(lines).toContain('Voter <b>')
        expect(lines).toContain('Crossed threshold')
    },
}

export const ChartVoterCrossedDown: Story = {
    ...chart({...VOTER_TALLY, voters: [voter('a', 962_000, 44.1, 55.9, 'down', true, 'nay')]}),
    play: async ({canvasElement}) => {
        await showVoters(canvasElement)
        await waitFor(() => expect(dataOf(canvasElement).length).toBeGreaterThan(0))
        const lines = lastTooltipLines(canvasElement, 'Voters')[0].join(' ')
        expect(lines).toContain('Voted Nay')
        expect(lines).toContain('Crossed threshold')
    },
}

export const ChartVotersInOneBlock: Story = {
    ...chart({...VOTER_TALLY, voters: [voter('a', 962_000, 50, 10, null, true), voter('b', 962_000, 44.1, 5.9, null, true, 'nay')]}),
    play: async ({canvasElement}) => {
        await showVoters(canvasElement)
        await waitFor(() => expect(dataOf(canvasElement).length).toBeGreaterThan(0))
        const lines = lastTooltipLines(canvasElement, 'Voters')[0].join(' ')
        expect(lines).toContain('Voter a')
        expect(lines).toContain('Voter b')
    },
}

export const ChartVoterNoImpact: Story = {
    ...chart({...VOTER_TALLY, voters: [voter('a', 962_000, 44.1, 0, null, false)]}),
    play: async ({canvasElement}) => {
        await showVoters(canvasElement)
        await waitFor(() => expect(dataOf(canvasElement).length).toBeGreaterThan(0))
        expect(lastTooltipLines(canvasElement, 'Voters')[0].join(' ')).toContain('Impact —')
    },
}

// a pointer next to a dot snaps onto it, one far off reads the lines where it is
export const ChartVoterSnap: Story = {
    ...ChartShowVoters,
    play: async ({canvasElement}) => {
        const host = canvasElement.querySelector<HTMLElement>('[_echarts_instance_]')!
        const chart = echarts.getInstanceByDom(host)!
        const hover = (offsetX: number, offsetY: number) => {
            chart.getZr().trigger('mousemove', {offsetX, offsetY})
            return [...host.querySelector('[data-chart-tip]')!.children].map(line => line.textContent).join(' ')
        }
        await showVoters(canvasElement)
        await waitFor(() => expect(dataOf(canvasElement)).toHaveLength(3))
        const [x, y] = chart.convertToPixel({gridIndex: 0}, [(962_000 - 951_440) / PER_HOUR, 44.1])
        await waitFor(() => expect(hover(x + 15, y)).toContain('Voter b'))
        const [farX, farY] = chart.convertToPixel({gridIndex: 0}, [HOURS * 0.8, 20])
        await waitFor(() => expect(hover(farX, farY)).not.toContain('Voter'))
    },
}

const NUMN = 10n ** 18n
const judged = voter('a', 962_000, 44.1, 10, null, true)

// the amount splits into own and delegated, the name carries its judgement badge
export const ChartVoterAmountAndBadge: Story = {
    ...chart({
        ...VOTER_TALLY,
        voters: [
            {
                ...judged,
                row: {
                    ...judged.row,
                    own: String(1_500n * NUMN),
                    delegated: String(500n * NUMN),
                    actor: {addr: judged.row.actor.addr, acc: {id: '0xa', identityDisplay: 'Voter a', identityJson: {judgements: [[0, {__kind: 'Reasonable'}]]}} as never},
                },
            },
        ],
    }),
    play: async ({canvasElement}) => {
        await showVoters(canvasElement)
        await waitFor(() => expect(dataOf(canvasElement)).toHaveLength(1))
        const lines = lastTooltipLines(canvasElement, 'Voters')[0].join(' ')
        expect(lines).toContain('Amount2,000 NUMN')
        expect(lines).toContain('1,500 + 500 delegated')
        expect(canvasElement.querySelector('[data-chart-tip] svg.lucide')).not.toBeNull()
    },
}
