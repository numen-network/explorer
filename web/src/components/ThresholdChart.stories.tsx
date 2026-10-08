import type {Meta, StoryObj} from '@storybook/nextjs-vite'
import {expect, waitFor} from 'storybook/test'
import type {Curve} from '@/lib/curves'
import {linear, reciprocal, stepped} from '../../../mock/fixtures/governance.js'
import {axesLegible, axisTexts, expectLegibleAxes, lastTooltipLines, tooltipsInView} from '../../.storybook/fit'
import {ThresholdChart} from './charts'
import {Card, CardContent, CardHeader, CardTitle} from './ui/card'

const meta = {title: 'Components/ThresholdChart'} satisfies Meta
export default meta
type Story = StoryObj<typeof meta>

const LINEAR = linear(5e8, 5e8, 1e9)
const RECIPROCAL = reciprocal('222222224', '333333335', '333333332')
const SUPPORT = reciprocal('5846821', '11734029', '1720990')
const STEPPED = stepped(1e9, 5e8, 1e8, 2e8)

interface Spec {
    name: string
    approval: object
    support: object
    hours: number
}

function Track({name, approval, support, hours}: Spec) {
    return (
        <Card className="gap-0 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[13px] leading-normal">{name}</CardTitle>
            </CardHeader>
            <CardContent>
                <ThresholdChart approval={approval as Curve} support={support as Curve} seconds={hours * 3600} />
            </CardContent>
        </Card>
    )
}

const grid = (tracks: Spec[]): Story => ({
    render: () => (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tracks.map(t => (
                <Track key={t.name} {...t} />
            ))}
        </div>
    ),
    play: axesLegible,
})

export const EveryCurveKind = grid([
    {name: 'Linear decreasing', approval: LINEAR, support: linear(1e9, 0, 5e8), hours: 672},
    {name: 'Reciprocal', approval: RECIPROCAL, support: SUPPORT, hours: 672},
    {name: 'Stepped decreasing', approval: STEPPED, support: stepped(2e8, 1e7, 5e7, 2.5e8), hours: 672},
])

export const PeriodLengths = grid([
    {name: 'One hour', approval: LINEAR, support: SUPPORT, hours: 1},
    {name: 'Forty seven hours', approval: LINEAR, support: SUPPORT, hours: 47},
    {name: 'Two days', approval: LINEAR, support: SUPPORT, hours: 48},
    {name: 'Seven days', approval: RECIPROCAL, support: SUPPORT, hours: 168},
    {name: 'One year', approval: RECIPROCAL, support: SUPPORT, hours: 8760},
])

export const PeriodLengthsTooltip: Story = {...PeriodLengths, play: tooltipsInView}

// the end of a period with part of a day left falls between two day ticks and
// the axis names it in days, while the tooltip there reads a month once the
// period runs past thirty days
export const PeriodsEndingMidDay: Story = {
    ...grid([
        {name: 'A hundred hours', approval: LINEAR, support: SUPPORT, hours: 100},
        {name: 'A thousand hours', approval: RECIPROCAL, support: SUPPORT, hours: 1000},
    ]),
    play: async ({canvasElement}) => {
        await waitFor(() => expectLegibleAxes(canvasElement))
        const [hundred, thousand] = axisTexts(canvasElement).map(axes => axes.flat())
        expect(hundred).toContain('4d 4h')
        expect(thousand).toContain('41d 16h')
        expect(lastTooltipLines(canvasElement).map(([title]) => title)).toEqual(['4d 4h', '1mo 11d'])
    },
}

// periods under a day that stop part way through an hour
export const PeriodsEndingMidHour: Story = {
    ...grid([
        {name: 'Ten minutes', approval: LINEAR, support: SUPPORT, hours: 10 / 60},
        {name: 'Ninety minutes', approval: LINEAR, support: SUPPORT, hours: 1.5},
    ]),
    play: async ({canvasElement}) => {
        await waitFor(() => expectLegibleAxes(canvasElement))
        const [ten, ninety] = axisTexts(canvasElement).map(axes => axes.flat())
        expect(ten).toContain('10m')
        expect(ninety).toContain('1h 30m')
        expect(lastTooltipLines(canvasElement).map(([title]) => title)).toEqual(['10m', '1h 30m'])
    },
}

export const FlatAndSpikedCurves = grid([
    {name: 'Never relaxes', approval: linear(1e9, 1e9, 1e9), support: linear(1e9, 0, 0), hours: 672},
    {name: 'Drops to its floor at once', approval: linear(0, 5e8, 1e9), support: reciprocal('1', '1', '0'), hours: 672},
])
