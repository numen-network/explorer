'use client'
import {Delta, VoteMove, VoteWeight} from '@/components/actionParts'
import {useChartTip} from '@/components/ChartTip'
import {shortAddr} from '@/components/AddressText'
import {NONE} from '@/components/Detail'
import Identicon from '@/components/Identicon'
import IdentityName from '@/components/IdentityName'
import {Badge} from '@/components/ui/badge'
import {Label} from '@/components/ui/label'
import {Switch} from '@/components/ui/switch'
import {cn} from 'cn'
import {ACCENT, ACCENT_SOFT, GRAY, GREEN, RED, SUPPORT, tint} from '@/lib/chartColors'
import type {CurveVoter} from '@/lib/curveVoters'
import {curveAt, curveSamples, type Curve} from '@/lib/curves'
import type {IdentityRef} from '@/lib/identity'
import {fmtApprox, fmtInt, fmtPct, fmtSpan, fmtTick, pctToNum, type Share} from '@/lib/format'
import {GRID_LEGEND, type GridCell, type GridVote} from '@/lib/voteGrid'
import * as echarts from 'echarts'
import {toSvg} from 'jdenticon'
import {useRouter} from 'next/navigation'
import {useEffect, useId, useRef, useState, type CSSProperties} from 'react'

const SUB = '#7c828e'
const EDGE = '#e8eaef'
const GREEN_FILL = 'rgba(76,175,80,.11)'
const SUB_FILL = 'rgba(124,130,142,.08)'
const LABEL_FONT = '11px sans-serif'

function useChart(option: echarts.EChartsOption, onClick?: (dataIndex: number) => void) {
    const ref = useRef<HTMLDivElement>(null)
    const chart = useRef<echarts.ECharts>(null)
    const click = useRef(onClick)
    useEffect(() => {
        click.current = onClick
    })
    useEffect(() => {
        const el = ref.current!
        chart.current = echarts.init(el)
        chart.current.on('click', p => click.current?.(p.dataIndex))
        const ro = new ResizeObserver(() => chart.current?.resize())
        ro.observe(el)
        return () => {
            ro.disconnect()
            chart.current?.dispose()
            chart.current = null
        }
    }, [])
    useEffect(() => {
        chart.current?.setOption(option)
    })
    return ref
}

function catAxis(labels: string[]): echarts.EChartsOption['xAxis'] {
    return {
        type: 'category',
        data: labels,
        axisLine: {lineStyle: {color: EDGE}},
        axisTick: {show: false},
        axisLabel: {color: SUB, fontSize: 11, textMargin: 0},
    }
}

// a label sits centred on its band with no text margin, and echarts picks the
// labelled bands only after fitting labels in, so both ends keep half the
// widest label free
function catRoom(labels: string[]): number {
    return Math.max(0, ...labels.map(l => echarts.format.getTextRect(l, LABEL_FONT).width)) / 2
}

function valAxis(scale = false): object {
    return {
        type: 'value',
        // a level series like issuance never returns to zero, anchoring the
        // axis there flattens every move it makes
        scale,
        splitLine: {lineStyle: {color: EDGE}},
        axisLabel: {color: SUB, fontSize: 11, textMargin: [0, 8], formatter: fmtTick},
    }
}

// echarts shrinks the plot from these offsets until every axis label and its
// text margin fit on the canvas, the bottom offset staying clear for the
// controls under a chart. a y label's side margin is its gap to the edge
function plotGrid({left = 0, right, top, bottom = 0}: {left?: number; right: number; top: number; bottom?: number}) {
    return {left, right, top, bottom, outerBounds: {left: 0, right: 0, top: 0, bottom}}
}

const TOOLTIP = {
    trigger: 'axis',
    confine: true,
    backgroundColor: '#fff',
    borderColor: EDGE,
    textStyle: {color: '#1a1c22', fontSize: 12},
} as const

// a line needs two values for a segment, so a lone value shows as a dot
function lineSymbol(values: number[]) {
    return {symbol: values.length === 1 ? 'circle' : 'none', symbolSize: 8}
}

export function BarsChart({labels, values, height = 210}: {labels: string[]; values: number[]; height?: number}) {
    const room = catRoom(labels)
    const ref = useChart({
        tooltip: {...TOOLTIP},
        grid: plotGrid({left: room, right: room, top: 12}),
        xAxis: catAxis(labels),
        yAxis: valAxis() as never,
        series: [
            {
                type: 'bar',
                barWidth: '55%',
                data: values.map((v, i) => ({
                    value: v,
                    itemStyle: {color: i === values.length - 1 ? ACCENT : ACCENT_SOFT, borderRadius: [3, 3, 0, 0]},
                })),
            },
        ],
    })
    return <div ref={ref} style={{height}} />
}

// the curve is a formula, so the point count comes from how smooth the line
// has to look rather than from the length of the period
const SAMPLES = 121

/** What a track demands of a referendum as its decision period runs out. */
export function ThresholdChart({approval, support, seconds, height = 180}: {approval: Curve; support: Curve; seconds: number; height?: number}) {
    // a track running for weeks reads in days while a short one stays in hours
    const unit = seconds >= 48 * 3600 ? 'd' : 'h'
    const span = seconds / (unit === 'd' ? 86400 : 3600)
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            formatter: (params: unknown) => {
                const list = params as {seriesName?: string; marker?: string; value: [number, number]; dataIndex: number}[]
                const rows = list
                    .map(p => `<div>${p.marker ?? ''}${p.seriesName ?? ''}<span style="float:right;margin-left:20px;font-weight:600">${fmtPct(p.value[1], 100)}</span></div>`)
                    .join('')
                return `<div style="margin-bottom:4px">${fmtSpan((seconds * list[0].dataIndex) / (SAMPLES - 1))}</div>${rows}`
            },
        },
        legend: {top: 0, right: 0, itemWidth: 18, itemGap: 14, textStyle: {color: SUB, fontSize: 11}},
        grid: plotGrid({right: 10, top: 30}),
        xAxis: {
            type: 'value',
            min: 0,
            max: span,
            // echarts splits a span with both ends pinned into fifths, which
            // puts the ticks on fractions of a day
            interval: Math.max(1, Math.ceil(span / 7)),
            axisLine: {lineStyle: {color: EDGE}},
            axisTick: {show: false},
            // ticks land on whole days or hours, and only the end of a period
            // with part of a day or an hour left lands between them, so it
            // reads as the whole period and wins over the tick it would crowd
            axisLabel: {color: SUB, fontSize: 11, showMaxLabel: true, formatter: (v: number) => (Number.isInteger(v) ? `${v}${unit}` : fmtSpan(seconds, unit))},
            splitLine: {show: false},
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            interval: 25,
            splitLine: {lineStyle: {color: EDGE}},
            axisLabel: {color: SUB, fontSize: 11, textMargin: [0, 4], formatter: (v: number) => `${v}%`},
        },
        series: [
            {name: 'Approval', type: 'line', symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: curveSamples(approval, span, SAMPLES)},
            {name: 'Support', type: 'line', symbol: 'none', lineStyle: {width: 2, color: SUPPORT}, itemStyle: {color: SUPPORT}, data: curveSamples(support, span, SAMPLES)},
        ],
    })
    return <div ref={ref} style={{height}} />
}

// the curves chart paints bottom up in this order. the axis line at hour
// zero splits the lead-in from the decision period
const LAYER = {window: 1, votes: 2, axis: 3, curve: 4, tally: 5, now: 6, voters: 7}

// a window shades the plot behind the curves and runs a pill along the top,
// the first label the pill is wide enough to hold sitting in a gap of it
function windows(label: string | string[], color: string, fill: string, spans: [number, number][]): echarts.CustomSeriesOption {
    return {
        type: 'custom',
        z: LAYER.window,
        silent: true,
        tooltip: {show: false},
        encode: {x: [0, 1]},
        data: spans,
        renderItem: (params, api) => {
            const sys = params.coordSys as {type: string; x: number; y: number; width: number; height: number}
            const x1 = Math.max(api.coord([api.value(0), 0])[0], sys.x)
            const x2 = Math.min(api.coord([api.value(1), 0])[0], sys.x + sys.width)
            if (x2 <= x1) return
            const y = sys.y - 12
            const text = [label].flat().find(t => x2 - x1 >= echarts.format.getTextRect(t, LABEL_FONT).width + 24)
            return {
                type: 'group',
                children: [
                    {type: 'rect', shape: {x: x1, y: sys.y, width: x2 - x1, height: sys.height}, style: {fill}},
                    {type: 'rect', shape: {x: x1 + 1, y: y - 2, width: Math.max(2, x2 - x1 - 2), height: 4, r: 2}, style: {fill: color}},
                    {type: 'text', ignore: text === undefined, x: (x1 + x2) / 2, y, style: {text, fill: color, fontSize: 11, align: 'center', verticalAlign: 'middle', backgroundColor: '#fff', padding: [0, 4]}},
                ],
            }
        },
    }
}

// about eight hour labels in view, whole days once a step reaches a day. the
// lead-in left of hour zero takes none, its window names it
function ticksIn(from: number, to: number): number[] {
    const span = to - from
    const step = span > 96 ? 24 * Math.ceil(span / 192) : [1, 2, 3, 6, 12].find(s => span / s <= 8)!
    const first = Math.max(0, Math.ceil(from / step) * step)
    return Array.from({length: Math.max(0, Math.floor((to - first) / step) + 1)}, (_, i) => first + i * step)
}

// the hover snaps to the nearest point and lists only the lines that have one
// there, so every line is read at the same hours: an even grid over the whole
// axis, a finer one over the window in view, and every step the tally took
const GRID = 600
const evenly = (from: number, to: number) => Array.from({length: GRID + 1}, (_, k) => from + ((to - from) * k) / GRID)

// below this container width the curves legend stacks one pair per row.
// a row is an item plus its gap. the container query classes repeat both numbers
const FOLD = 470
const LEGEND_ROW = 32
// echarts reads '' and '\n' as legend line breaks but drops repeated
// names, so each break needs its own
const LEGEND_BREAKS = ['', '\n']

// a tally step holds its share of the vote from its hour on
export type TallyStep = [hour: number, share: Share]

// the aye and nay totals in planck from the step's hour on
export type VoteStep = [hour: number, ayes: bigint, nays: bigint]

type Held = [hour: number, value: number, reading: string]

interface HeldPoint {
    value: [hour: number, value: number]
    reading: string
}

// the last recorded reading at each hour. the points sit on the axis floor so
// they never scale it
function heldAt(steps: Held[], grid: number[]): HeldPoint[] {
    let i = 0
    return grid.map(h => {
        while (i + 1 < steps.length && steps[i + 1][0] <= h) i++
        return {value: [h, 0], reading: steps[i][2]}
    })
}

const readingId = (name: string) => `${name} reading`

// an unseen line on the hover grid that lends a stepped series its tooltip row.
// echarts drops points closer than a pixel while painting, so a stepped series
// on that grid would slant its edges
const readings = (name: string, color: string, data: HeldPoint[]) => ({
    id: readingId(name),
    name,
    type: 'line' as const,
    silent: true,
    symbol: 'none',
    lineStyle: {opacity: 0},
    itemStyle: {color},
    emphasis: {disabled: true},
    data,
})

const sharesOf = (steps: TallyStep[]): Held[] => steps.map(([h, share]) => [h, pctToNum(...share), fmtPct(...share)])

const VOTERS = 'Voters'
const VOTER_SIZE = {min: 18, crossed: 22, max: 28}
const VOTER_RING = {up: GREEN, down: RED}
const VOTER_REACH = 14

function voterFace({hex, crossed}: CurveVoter): string {
    const ring = crossed ? `<circle cx="32" cy="32" r="28" fill="none" stroke="${VOTER_RING[crossed]}" stroke-width="8"/>` : '<circle cx="32" cy="32" r="30.5" fill="none" stroke="#c9ced6" stroke-width="3"/>'
    const icon = toSvg(hex.slice(2), 54).replace('<svg ', '<svg x="5" y="5" ')
    return `image://data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#fff"/>${icon}${ring}</svg>`)}`
}

// dot area tracks the move, the referendum's biggest move gets the largest dot
function voterPoints(voters: CurveVoter[]) {
    const most = Math.max(0, ...voters.map(v => v.moved))
    return voters
        .toSorted((a, b) => Number(a.crossed !== null) - Number(b.crossed !== null))
        .map(voter => {
            const size = VOTER_SIZE.min + (VOTER_SIZE.max - VOTER_SIZE.min) * (most > 0 ? Math.sqrt(voter.moved / most) : 0)
            return {value: [voter.hour, voter.approval], voter, symbol: voterFace(voter), symbolSize: voter.crossed ? Math.max(size, VOTER_SIZE.crossed) : size}
        })
}

function VoterName({addr, acc}: {addr: string; acc?: IdentityRef}) {
    return (
        <span className="inline-flex min-w-0 items-center gap-1">
            <IdentityName acc={acc} fallback={<span className="font-medium">{shortAddr(addr)}</span>} />
        </span>
    )
}

function VoterMove({row}: {row: CurveVoter['row']}) {
    switch (row.kind) {
        case 'vote':
        case 'remove':
            return <VoteMove removed={row.kind === 'remove'} decision={row.decision} />
        default:
            return (
                <span>
                    {row.kind === 'delegate' ? 'Delegated by' : 'Undelegated by'} <VoterName {...row.by} />
                </span>
            )
    }
}

function VoterTip({voter: {hex, row, crossed}, unit}: {voter: CurveVoter; unit: {decimals: number; symbol: string}}) {
    return (
        <div className="mt-1.5 max-w-60 border-t border-input pt-1.5 whitespace-normal">
            <div className="flex items-center gap-1.5">
                <Identicon hex={hex} className="size-4" />
                <VoterName {...row.actor} />
            </div>
            <VoterMove row={row} />
            <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-right">
                    <VoteWeight own={BigInt(row.own)} delegated={BigInt(row.delegated)} {...unit} />
                </span>
            </div>
            {row.impact ? (
                <div className="flex justify-between gap-4">
                    <Delta label="Approval" value={row.impact.approval} />
                    <Delta label="Support" value={row.impact.support} />
                </div>
            ) : (
                <div className="text-muted-foreground">Impact {NONE}</div>
            )}
            {crossed && <Badge className={crossed === 'up' ? 'mt-1 bg-good-soft text-good' : 'mt-1 bg-destructive-soft text-destructive'}>Crossed threshold</Badge>}
        </div>
    )
}

// the threshold curves run the whole decision period, the dashed pair steps
// through the recorded tally history from submission on. x counts hours from
// the clock's zero block, so the lead-in sits left of hour zero at its true
// length
export function CurvesChart({
    approval,
    support,
    currentApproval,
    currentSupport,
    currentVotes,
    voters,
    unit,
    now,
    confirmations,
    earlyEnd,
    hours,
    clock,
    lead,
    height = 320,
}: {
    approval: Curve
    support: Curve
    currentApproval: TallyStep[]
    currentSupport: TallyStep[]
    currentVotes: VoteStep[]
    voters: CurveVoter[]
    unit: {decimals: number; symbol: string}
    now: {at: number} | null
    confirmations: [number, number][]
    earlyEnd: number | null
    hours: number
    clock: {zero: number; perHour: number; blockTime: number; started: boolean}
    lead: {from: number; submitted: number}
    height?: number
}) {
    const walked = (name: string, steps: Held[], color: string) => ({
        id: name,
        name,
        type: 'line' as const,
        z: LAYER.tally,
        symbol: 'none',
        step: 'end' as const,
        tooltip: {show: false},
        lineStyle: {width: 2, color, type: 'dashed' as const},
        itemStyle: {color},
        data: steps.map(([h, value]) => [h, value]),
    })
    const [showVotes, setShowVotes] = useState(false)
    const toggle = useId()
    const [showVoters, setShowVoters] = useState(false)
    const votersToggle = useId()
    const chartTip = useChartTip()
    // the aye area at the bottom, the nay area on top of it
    const piled = (name: string, data: [number, number | null][], color: string) => ({
        id: name,
        name,
        type: 'line' as const,
        yAxisIndex: 1,
        stack: 'votes',
        stackOrder: 'seriesDesc' as const,
        z: LAYER.votes,
        symbol: 'none',
        step: 'end' as const,
        tooltip: {show: false},
        lineStyle: {width: 0},
        itemStyle: {color: tint(color, 0.45)},
        areaStyle: {color: tint(color, 0.3), opacity: 1},
        emphasis: {disabled: true},
        data,
    })
    const amountsOf = (pick: 1 | 2): Held[] => currentVotes.map(step => [step[0], Number(step[pick]) / 10 ** unit.decimals, fmtApprox(step[pick], unit.decimals, unit.symbol)])
    const heightsOf = (pick: 1 | 2) => amountsOf(pick).map(([h, value]): [number, number] => [h, value])
    // a run of zero nays leaves a gap. a layer of no height still paints a
    // fringe wherever the two passes around it drop different points
    const nayHeights = heightsOf(2).map(([h, value], i, all): [number, number | null] => [h, value === 0 && (i === 0 || all[i - 1][1] === 0) ? null : value])
    const blockAt = (h: number) => clock.zero + Math.round(h * clock.perHour)
    // thresholds exist from hour zero on, the tally up to its last step
    const lines = (from: number, to: number) => {
        const grid = [...new Set([...evenly(lead.from, hours), ...evenly(from, to), ...currentApproval.map(([h]) => h), ...voters.map(v => v.hour)])].sort((a, b) => a - b)
        const deciding = grid.filter(h => h >= 0)
        const tallied = grid.filter(h => h <= currentApproval.at(-1)![0])
        return {
            approval: deciding.map((h): [number, number] => [h, curveAt(approval, h / hours) * 100]),
            support: deciding.map((h): [number, number] => [h, curveAt(support, h / hours) * 100]),
            currentApproval: heldAt(sharesOf(currentApproval), tallied),
            currentSupport: heldAt(sharesOf(currentSupport), tallied),
            ayes: showVotes ? heldAt(amountsOf(1), tallied) : [],
            nays: showVotes ? heldAt(amountsOf(2), tallied) : [],
        }
    }
    const shown = lines(lead.from, hours)
    const legendPairs = [
        [{name: 'Approval'}, {name: 'Current approval', lineStyle: {type: 'dashed' as const}}],
        [{name: 'Support'}, {name: 'Current support', lineStyle: {type: 'dashed' as const}}],
        ...(showVotes ? [[{name: 'Aye', icon: 'rect'}, {name: 'Nay', icon: 'rect'}]] : []),
    ]
    const points = showVoters ? voterPoints(voters) : []
    const opt: echarts.EChartsOption = {
        axisPointer: {triggerOn: 'none'},
        tooltip: {
            ...TOOLTIP,
            triggerOn: 'none',
            formatter: (params: unknown) => {
                const list = params as {axisValue: number; seriesName?: string; color?: string; value: [number, number]; data: [number, number] | HeldPoint | {voter: CurveVoter}}[]
                const at = list[0].axisValue
                const block = blockAt(at)
                const head =
                    at < 0
                        ? `Lead-in ${fmtSpan((block - lead.submitted) * clock.blockTime)} · #${fmtInt(block)}`
                        : `${fmtSpan((block - clock.zero) * clock.blockTime)}${clock.started ? ` · #${fmtInt(block)}` : ''}`
                // a held point prints its own reading, a threshold point the curve value it plots
                const reading = ({data, value}: (typeof list)[number]) => ('reading' in data ? data.reading : fmtPct(value[1], 100))
                const order = legendPairs.flat().map(entry => entry.name)
                const rows = list.filter(p => p.seriesName !== VOTERS).toSorted((a, b) => order.indexOf(a.seriesName!) - order.indexOf(b.seriesName!))
                const here = list.flatMap(({data}) => ('voter' in data ? [data.voter] : []))
                return chartTip(
                    <>
                        <div className="mb-1">{head}</div>
                        {rows.map(p => (
                            <div key={p.seriesName}>
                                <span className="mr-1.5 inline-block size-2.5 rounded-full" style={{backgroundColor: p.color}} />
                                {p.seriesName}
                                <span className="float-right ml-5 font-semibold">{reading(p)}</span>
                            </div>
                        ))}
                        {here.map(voter => (
                            <VoterTip key={voter.row.id} voter={voter} unit={unit} />
                        ))}
                    </>
                )
            },
        },
        // the legend hangs from its top edge so a wrapped second row grows
        // toward the card edge instead of into the slider above it
        legend: {
            top: height - 46,
            itemWidth: 22,
            itemGap: 18,
            textStyle: {color: SUB, fontSize: 11},
            data: legendPairs.flat(),
        },
        grid: plotGrid({right: showVotes ? 0 : 20, top: 32, bottom: 70}),
        // filter mode would drop the points behind the window edge and cut
        // the step lines off with them
        dataZoom: [
            {type: 'inside', filterMode: 'none'},
            {
                type: 'slider',
                filterMode: 'none',
                bottom: 52,
                height: 10,
                borderColor: 'transparent',
                backgroundColor: '#f1f2f5',
                fillerColor: 'rgba(8,145,178,.10)',
                handleSize: 14,
                handleStyle: {color: '#fff', borderColor: GRAY},
                moveHandleSize: 0,
                showDetail: false,
                brushSelect: false,
            },
        ],
        xAxis: {
            type: 'value',
            min: lead.from,
            max: hours,
            axisLine: {lineStyle: {color: EDGE}},
            axisTick: {show: false},
            axisLabel: {color: SUB, fontSize: 11, customValues: ticksIn(lead.from, hours), formatter: (v: number) => `${v}h`},
            splitLine: {show: false},
        },
        yAxis: [
            {
                type: 'value',
                z: LAYER.axis,
                min: 0,
                max: 100,
                interval: 25,
                splitLine: {lineStyle: {color: EDGE}},
                axisLabel: {color: SUB, fontSize: 11, textMargin: [0, 8], formatter: (v: number) => `${v}%`},
            },
            {
                type: 'value',
                show: showVotes,
                min: 0,
                splitNumber: 4,
                axisLine: {show: false},
                axisTick: {show: false},
                splitLine: {show: false},
                axisLabel: {color: SUB, fontSize: 11, textMargin: [0, 8], formatter: fmtTick},
            },
        ],
        series: [
            {
                name: 'Support',
                type: 'line',
                z: LAYER.curve,
                symbol: 'none',
                lineStyle: {width: 2, color: SUPPORT},
                itemStyle: {color: SUPPORT},
                data: shown.support,
                markLine: now
                    ? {z: LAYER.now, silent: true, symbol: 'none', label: {show: false}, lineStyle: {color: GRAY, type: 'dashed', width: 1}, data: [{xAxis: now.at}]}
                    : undefined,
            },
            walked('Current support', sharesOf(currentSupport), SUPPORT),
            {name: 'Approval', type: 'line' as const, z: LAYER.curve, symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: shown.approval},
            walked('Current approval', sharesOf(currentApproval), GREEN),
            piled('Nay', showVotes ? nayHeights : [], RED),
            piled('Aye', showVotes ? heightsOf(1) : [], GREEN),
            readings('Current support', SUPPORT, shown.currentSupport),
            readings('Current approval', GREEN, shown.currentApproval),
            readings('Nay', tint(RED, 0.45), shown.nays),
            readings('Aye', tint(GREEN, 0.45), shown.ayes),
            {name: VOTERS, type: 'scatter' as const, z: LAYER.voters, itemStyle: {opacity: 1}, data: points},
            windows([`Lead-in ${fmtSpan((clock.zero - lead.submitted) * clock.blockTime)}`, 'Lead-in'], SUB, SUB_FILL, [[lead.from, 0]]),
            windows('Confirmation', GREEN, GREEN_FILL, confirmations),
            windows(now ? 'Ends early' : 'Ended early', SUB, SUB_FILL, earlyEnd !== null ? [[earlyEnd, hours]] : []),
        ],
    }
    // a narrow container stacks the legend one pair per row. the aye/nay
    // pair adds a third row, so the container grows a row and the plot and
    // slider move up into it. the no-query unit puts the legend back on one
    // row
    const lifted = (rows: number) => ({grid: {bottom: 70 + rows * LEGEND_ROW, outerBounds: {bottom: 70 + rows * LEGEND_ROW}}, dataZoom: [{}, {bottom: 52 + rows * LEGEND_ROW}]})
    const ref = useChart({
        baseOption: opt,
        media: [
            {query: {maxWidth: FOLD}, option: {legend: {data: legendPairs.flatMap((pair, i) => (i > 0 ? [LEGEND_BREAKS[i - 1], ...pair] : pair))}, ...lifted(showVotes ? 1 : 0)}},
            {option: {legend: {data: legendPairs.flat()}, ...lifted(0)}},
        ],
    })
    // the hour labels and the line readings follow a zoom a frame later,
    // updating inside the event strands the window labels where the zoom
    // found them
    useEffect(() => {
        const chart = echarts.getInstanceByDom(ref.current!)!
        const refocus = () => {
            requestAnimationFrame(() => {
                const [zoom] = chart.getOption().dataZoom as {startValue: number; endValue: number}[]
                const [from, to] = [zoom.startValue, zoom.endValue]
                const next = lines(from, to)
                chart.setOption({
                    xAxis: {axisLabel: {customValues: ticksIn(from, to)}},
                    series: [
                        {name: 'Support', data: next.support},
                        {id: readingId('Current support'), data: next.currentSupport},
                        {name: 'Approval', data: next.approval},
                        {id: readingId('Current approval'), data: next.currentApproval},
                        {id: readingId('Aye'), data: next.ayes},
                        {id: readingId('Nay'), data: next.nays},
                    ],
                })
            })
        }
        chart.on('datazoom', refocus)
        // a render resets the axis and lines to the whole period. flipping
        // the aye/nay switch renders while zoomed in
        refocus()
        // useChart has already disposed the chart when this runs on unmount
        return () => {
            if (!chart.isDisposed()) chart.off('datazoom', refocus)
        }
    }, [ref, lines])
    // the pointer snaps onto a voter within reach, the tooltip and its line follow
    useEffect(() => {
        const chart = echarts.getInstanceByDom(ref.current!)!
        const zr = chart.getZr()
        const point = ({offsetX: x, offsetY: y}: {offsetX: number; offsetY: number}) => {
            const [zoom] = chart.getOption().dataZoom as {startValue: number; endValue: number}[]
            const near = points
                .filter(p => p.value[0] >= zoom.startValue && p.value[0] <= zoom.endValue)
                .map(p => {
                    const [px, py] = chart.convertToPixel({gridIndex: 0}, p.value)
                    return {px, py, gap: Math.hypot(px - x, py - y) - p.symbolSize / 2}
                })
                .filter(p => p.gap <= VOTER_REACH)
                .sort((a, b) => a.gap - b.gap)[0]
            if (near) chart.dispatchAction({type: 'showTip', x: near.px, y: near.py})
            else if (chart.containPixel('grid', [x, y])) chart.dispatchAction({type: 'showTip', x, y})
            else chart.dispatchAction({type: 'hideTip'})
        }
        const leave = () => chart.dispatchAction({type: 'hideTip'})
        zr.on('mousemove', point)
        zr.on('click', point)
        zr.on('globalout', leave)
        return () => {
            if (chart.isDisposed()) return
            zr.off('mousemove', point)
            zr.off('click', point)
            zr.off('globalout', leave)
        }
    }, [ref, points])
    return (
        <div className="@container">
            <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1">
                <div className="flex items-center gap-2">
                    <Label htmlFor={votersToggle} className="text-xs font-normal text-muted-foreground">
                        Show Voters
                    </Label>
                    <Switch id={votersToggle} checked={showVoters} onCheckedChange={setShowVoters} className="data-unchecked:bg-dim" />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor={toggle} className="text-xs font-normal text-muted-foreground">
                        Aye/Nay Value
                    </Label>
                    <Switch id={toggle} checked={showVotes} onCheckedChange={setShowVotes} className="data-unchecked:bg-dim" />
                </div>
            </div>
            <div ref={ref} style={{'--h': `${height}px`} as CSSProperties} className={cn('h-(--h)', showVotes && '@max-[470px]:h-[calc(var(--h)+32px)]')} />
        </div>
    )
}

// the slider under a full chart, its shadow traced from the data
function zoomRail(shadow: boolean) {
    return {
        type: 'slider' as const,
        bottom: 12,
        height: 22,
        borderColor: 'transparent',
        backgroundColor: '#f7f8fa',
        fillerColor: 'rgba(8,145,178,.08)',
        handleSize: 16,
        handleStyle: {color: '#fff', borderColor: GRAY},
        moveHandleSize: 0,
        showDetail: false,
        brushSelect: false,
        // a lone value has no outline for the rail to shadow
        showDataShadow: shadow,
        labelFormatter: (_: number, s: string) => s,
    }
}

// the full page chart behind /charts, one series with a zoom rail under it.
// tips are formatted server side so the registry stays the only place that
// knows about decimals and symbols
export function SeriesChart({
    labels,
    values,
    tips,
    name,
    kind,
    height = 420,
}: {
    labels: string[]
    values: number[]
    tips: string[]
    name: string
    kind: 'line' | 'bar'
    height?: number
}) {
    const room = catRoom(labels)
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            formatter: (args: unknown) => {
                const p = (Array.isArray(args) ? args[0] : args) as {axisValueLabel: string; marker: string; dataIndex: number; value: number}
                return `${p.axisValueLabel}<br/>${p.marker} ${name} <b>${tips[p.dataIndex] ?? p.value}</b>`
            },
        },
        grid: plotGrid({left: room, right: room, top: 20, bottom: 58}),
        dataZoom: [{type: 'inside'}, zoomRail(values.length > 1)],
        xAxis: catAxis(labels),
        yAxis: valAxis(kind === 'line') as never,
        series: [
            kind === 'bar'
                ? {name, type: 'bar' as const, barMaxWidth: 24, itemStyle: {color: ACCENT_SOFT, borderRadius: [3, 3, 0, 0]}, data: values}
                : {
                      name,
                      type: 'line' as const,
                      smooth: 0.2,
                      ...lineSymbol(values),
                      lineStyle: {width: 2, color: ACCENT},
                      itemStyle: {color: ACCENT},
                      areaStyle: {opacity: 0.07, color: ACCENT},
                      data: values,
                  },
        ],
    })
    return <div ref={ref} style={{height}} />
}

export interface ComboSeries {
    name: string
    type: 'line' | 'bar'
    color: string
    values: number[]
    // what the tooltip prints for each value
    tips: string[]
    // series of one type sharing a stack pile up
    stack?: string
    area?: boolean
}

// a line steps, each label holding its own value across its band rather than
// sloping into the next.
// total names a figure the tooltip leads with, one per label
// where the plot starts, in pixels from the chart's left edge. echarts keeps
// the grid rect to itself, so this walks in from the first category's centre
// until the point leaves the grid
function plotLeft(chart: echarts.ECharts): number {
    const [x0, y0] = chart.convertToPixel({gridIndex: 0}, [0, 0])
    let [out, inside] = [0, x0]
    while (inside - out > 0.25) {
        const x = (out + inside) / 2
        if (chart.containPixel({gridIndex: 0}, [x, y0 - 1])) inside = x
        else out = x
    }
    return inside
}

export function ComboChart({labels, series, total, note, height = 380}: {labels: string[]; series: ComboSeries[]; total?: {name: string; tips: string[]}; note: string; height?: number}) {
    // unknown until the first frame lays the plot out
    const [indent, setIndent] = useState<number | null>(null)
    const room = catRoom(labels)
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            formatter: (params: unknown) => {
                const list = params as {dataIndex: number; axisValueLabel: string; seriesIndex: number}[]
                const i = list[0].dataIndex
                const head = total ? `<div>${total.name}: <b>${total.tips[i]}</b></div>` : ''
                return `<div style="margin-bottom:4px">${list[0].axisValueLabel} (UTC)</div>${head}${list.map(p => tipRow(series[p.seriesIndex].color, series[p.seriesIndex].name, series[p.seriesIndex].tips[i])).join('')}`
            },
        },
        legend: {
            bottom: 44,
            icon: 'circle',
            itemWidth: 8,
            itemHeight: 8,
            textStyle: {color: SUB, fontSize: 11},
        },
        grid: plotGrid({left: room, right: room, top: 12, bottom: 84}),
        dataZoom: [{type: 'inside'}, zoomRail(labels.length > 1)],
        xAxis: catAxis(labels),
        yAxis: valAxis() as never,
        series: series.map((s, i) =>
            s.type === 'line'
                ? {
                      name: s.name,
                      type: 'line' as const,
                      step: 'middle' as const,
                      stack: s.stack,
                      // a layer at zero runs along the top of the one under
                      // it, so the lower layer paints last and keeps its edge
                      z: 2 + series.length - i,
                      ...lineSymbol(s.values),
                      lineStyle: {width: 2, color: s.color},
                      itemStyle: {color: s.color},
                      areaStyle: s.area ? {opacity: 0.18, color: s.color} : undefined,
                      data: s.values,
                  }
                : {
                      name: s.name,
                      type: 'bar' as const,
                      stack: s.stack,
                      barMaxWidth: 14,
                      itemStyle: {color: s.color},
                      data: s.values,
                  }
        ),
    })
    // the note lines up with the plot, which moves with the widest value axis
    // label, so it reads the plot's place on every frame
    useEffect(() => {
        const chart = echarts.getInstanceByDom(ref.current!)!
        const align = () => setIndent(plotLeft(chart))
        chart.on('rendered', align)
        // useChart disposes the instance first when both unmount
        return () => {
            if (!chart.isDisposed()) chart.off('rendered', align)
        }
    }, [ref])
    return (
        <>
            <div ref={ref} style={{height}} />
            <div className="mt-2 text-xs text-dim" style={{paddingLeft: indent ?? 0, visibility: indent == null ? 'hidden' : undefined}}>
                {note}
            </div>
        </>
    )
}

export interface LineSeries {
    name: string
    values: number[]
    // what the tooltip prints for each value
    tips: string[]
    color?: string
    area?: boolean
}

export function LinesChart({labels, series, height = 210, dualAxis = false}: {labels: string[]; series: LineSeries[]; height?: number; dualAxis?: boolean}) {
    const room = catRoom(labels)
    const ref = useChart({
        tooltip: {...TOOLTIP},
        legend: series.length > 1 ? {top: 0, right: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: {color: SUB, fontSize: 11}} : undefined,
        grid: plotGrid({left: room, right: room, top: series.length > 1 ? 28 : 12}),
        xAxis: catAxis(labels),
        yAxis: dualAxis ? ([valAxis(), {...valAxis(), splitLine: {show: false}}] as never) : (valAxis() as never),
        series: series.map((s, i) => ({
            name: s.name,
            type: 'line' as const,
            smooth: 0.35,
            ...lineSymbol(s.values),
            yAxisIndex: dualAxis ? i : 0,
            lineStyle: {width: 2, color: s.color ?? (i === 0 ? ACCENT : GRAY)},
            itemStyle: {color: s.color ?? (i === 0 ? ACCENT : GRAY)},
            areaStyle: s.area ? {opacity: 0.08} : undefined,
            tooltip: {valueFormatter: (_: unknown, dataIndex: number) => s.tips[dataIndex]},
            data: s.values,
        })),
    })
    return <div ref={ref} style={{height}} />
}

export interface StackSeries {
    name: string
    color: string
    values: number[]
    // what the tooltip prints for each value
    tips: string[]
}

// a tooltip row, a square of the bar's colour, its name and the value to the right
const tipRow = (color: string, name: string, value: string) =>
    `<div><span style="display:inline-block;width:9px;height:9px;margin-right:6px;border-radius:2px;background:${color}"></span>${name}<span style="float:right;margin-left:20px;font-weight:600">${value}</span></div>`

// stacked bars with each stack's total written on top. axis brings in a
// value axis from zero to one round step past the tallest stack
export function StackChart({
    labels,
    series,
    totals,
    axis = false,
    height = 172,
}: {
    labels: string[]
    series: StackSeries[]
    totals: string[]
    axis?: boolean
    height?: number
}) {
    const barWidth = 14
    const room = catRoom(labels)
    // every bar keeps its label, two neighbours too wide to sit side by side
    // under their bars break after the dash
    const widths = labels.map(l => echarts.format.getTextRect(l, LABEL_FONT).width)
    const crowded = labels.length * Math.max(0, ...widths.slice(1).map((w, i) => (w + widths[i]) / 2 + 4)) + (axis ? 24 : 0)
    const x = catAxis(labels) as {axisLabel: object}
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            axisPointer: {type: 'shadow', shadowStyle: {color: SUB_FILL}},
            formatter: (params: unknown) => {
                const [p] = params as {dataIndex: number; axisValueLabel: string}[]
                return `<div style="margin-bottom:4px">${p.axisValueLabel}</div>${series.map(s => tipRow(s.color, s.name, s.tips[p.dataIndex])).join('')}`
            },
        },
        grid: plotGrid({left: room, right: room, top: 22}),
        xAxis: {...x, axisLabel: {...x.axisLabel, interval: 0}},
        media: [{query: {maxWidth: crowded}, option: {xAxis: {axisLabel: {formatter: (label: string) => label.replace('-', '-\n')}}}}],
        yAxis: axis
            ? {type: 'value', minInterval: 1, splitNumber: 1, axisLine: {show: true, lineStyle: {color: EDGE}}, splitLine: {show: false}, axisLabel: {color: SUB, fontSize: 11, textMargin: [0, 8]}}
            : {type: 'value', show: false},
        series: [
            ...series.map(s => ({type: 'bar' as const, name: s.name, stack: 'all', barWidth, itemStyle: {color: s.color}, data: s.values})),
            // an empty bar on top of each stack carries its total
            {
                type: 'bar' as const,
                name: 'total',
                stack: 'all',
                barWidth,
                tooltip: {show: false},
                label: {show: true, position: 'top' as const, color: '#1a1c22', fontSize: 12, fontWeight: 500, formatter: ({dataIndex}: {dataIndex: number}) => totals[dataIndex]},
                data: labels.map(() => 0),
            },
        ],
    })
    return <div ref={ref} style={{height}} />
}

export interface RingSlice {
    label: string
    value: number
    color: string
    tip: string
}

// a ring of shares with the whole written in its hole
export function RingChart({slices, total, unit}: {slices: RingSlice[]; total: string; unit: string}) {
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            trigger: 'item',
            formatter: (params: unknown) => {
                const s = slices[(params as {dataIndex: number}).dataIndex]
                return tipRow(s.color, s.label, s.tip)
            },
        },
        series: [{type: 'pie', radius: ['78%', '100%'], label: {show: false}, emphasis: {scale: false}, data: slices.map(s => ({name: s.label, value: s.value, itemStyle: {color: s.color}}))}],
    })
    return (
        <div className="relative size-42 shrink-0">
            <div ref={ref} className="size-full" />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-[17px] font-semibold">{total}</span>
                <span className="text-xs text-muted-foreground">{unit}</span>
            </div>
        </div>
    )
}

// --good and --destructive mixed 45% into white
const LIGHT_GOOD = '#aedbb0'
const LIGHT_BAD = '#faaaa4'
const HOLLOW = '#d5d8dd'

const GRID_ROWS = 5
const GRID_STEP = 18
const GRID_PAD = 6
const HALF = 5

/** One square drawn the way a referendum's cell is. */
export function GridSwatch({vote}: {vote: GridVote}) {
    const style =
        vote === 'split'
            ? {background: `linear-gradient(135deg, ${LIGHT_GOOD} 50%, ${LIGHT_BAD} 50%)`}
            : vote === null
              ? {border: `1px solid ${HOLLOW}`, background: '#fff'}
              : {background: vote === 'aye' ? LIGHT_GOOD : vote === 'nay' ? LIGHT_BAD : EDGE}
    return <span className="block size-2.5 rounded-[2px]" style={style} />
}

function gridSquare(x: number, y: number, vote: GridVote) {
    const box = {x: x - HALF, y: y - HALF, width: HALF * 2, height: HALF * 2, r: 2}
    switch (vote) {
        case 'split':
            return {
                type: 'group',
                children: [
                    {type: 'rect', shape: box, style: {fill: LIGHT_GOOD}},
                    {type: 'polygon', shape: {points: [[x + HALF, y - HALF], [x + HALF, y + HALF], [x - HALF, y + HALF]]}, style: {fill: LIGHT_BAD}},
                ],
            }
        case null:
            return {type: 'rect', shape: {...box, x: box.x + 0.5, y: box.y + 0.5, width: box.width - 1, height: box.height - 1}, style: {fill: '#fff', stroke: HOLLOW, lineWidth: 1}}
        default:
            return {type: 'rect', shape: box, style: {fill: vote === 'aye' ? LIGHT_GOOD : vote === 'nay' ? LIGHT_BAD : EDGE}}
    }
}

// five referenda to a column in index order, the columns that do not fit
// scroll like any chart, opening on the newest
export function VoteGrid({cells}: {cells: GridCell[]}) {
    const router = useRouter()
    const [width, setWidth] = useState(0)
    const cols = Math.ceil(cells.length / GRID_ROWS)
    const fit = Math.max(1, Math.floor((width - GRID_PAD * 2) / GRID_STEP))
    const span = Math.max(cols, fit)
    const scrolls = width > 0 && cols > fit
    const ref = useChart(
        {
            animation: false,
            tooltip: {
                ...TOOLTIP,
                trigger: 'item',
                formatter: (params: unknown) => {
                    const c = cells[(params as {dataIndex: number}).dataIndex]
                    const title = c.title ? ` · ${echarts.format.encodeHTML(c.title)}` : ''
                    return `#${c.index}${title}<br/>Vote: ${GRID_LEGEND.find(l => l.vote === c.vote)!.label}`
                },
            },
            grid: {left: GRID_PAD, right: GRID_PAD, top: GRID_PAD, height: GRID_ROWS * GRID_STEP - GRID_PAD * 2},
            xAxis: {type: 'value', min: -0.5, max: span - 0.5, show: false},
            yAxis: {type: 'value', min: -0.5, max: GRID_ROWS - 0.5, inverse: true, show: false},
            dataZoom: [
                {type: 'inside', disabled: !scrolls, zoomLock: true, filterMode: 'none', startValue: span - fit - 0.5, endValue: span - 0.5},
                {
                    type: 'slider',
                    show: scrolls,
                    zoomLock: true,
                    filterMode: 'none',
                    bottom: 12,
                    height: 10,
                    borderColor: 'transparent',
                    backgroundColor: '#f1f2f5',
                    fillerColor: 'rgba(8,145,178,.10)',
                    handleSize: 14,
                    handleStyle: {color: '#fff', borderColor: GRAY},
                    moveHandleSize: 0,
                    showDetail: false,
                    brushSelect: false,
                    showDataShadow: false,
                },
            ],
            series: [
                {
                    type: 'custom',
                    clip: true,
                    cursor: 'pointer',
                    data: cells.map((c, i) => [Math.floor(i / GRID_ROWS), i % GRID_ROWS]),
                    renderItem: ((params: {dataIndex: number}, api: {value: (dim: number) => number; coord: (v: number[]) => number[]}) => {
                        const [x, y] = api.coord([api.value(0), api.value(1)])
                        return gridSquare(x, y, cells[params.dataIndex].vote)
                    }) as never,
                },
            ],
        },
        i => router.push(`/referendum/${cells[i].index}`)
    )
    useEffect(() => {
        const ro = new ResizeObserver(([e]) => setWidth(e.contentRect.width))
        ro.observe(ref.current!)
        return () => ro.disconnect()
    }, [ref])
    return <div ref={ref} style={{height: GRID_ROWS * GRID_STEP + (scrolls ? 34 : 0)}} />
}
