'use client'
import {curveAt, curveSamples, type Curve} from '@/lib/curves'
import {fmtBlockSpan, fmtCompact, fmtInt} from '@/lib/format'
import * as echarts from 'echarts'
import {useEffect, useRef} from 'react'

const SUB = '#7c828e'
const EDGE = '#e8eaef'
const ACCENT = '#0891b2'
const ACCENT_SOFT = '#c4e5ed'
const GRAY = '#9aa1ad'
const GREEN = '#4caf50'
const SUPPORT = '#7c3aed'
const GREEN_FILL = 'rgba(76,175,80,.11)'
const SUB_FILL = 'rgba(124,130,142,.08)'

function useChart(option: echarts.EChartsOption) {
    const ref = useRef<HTMLDivElement>(null)
    const chart = useRef<echarts.ECharts>(null)
    useEffect(() => {
        const el = ref.current!
        chart.current = echarts.init(el)
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
        axisLabel: {color: SUB, fontSize: 11},
    }
}

function valAxis(scale = false): object {
    return {
        type: 'value',
        // a level series like issuance never returns to zero, anchoring the
        // axis there flattens every move it makes
        scale,
        splitLine: {lineStyle: {color: EDGE}},
        axisLabel: {color: SUB, fontSize: 11, formatter: fmtCompact},
    }
}

const TOOLTIP = {
    trigger: 'axis',
    backgroundColor: '#fff',
    borderColor: EDGE,
    textStyle: {color: '#1a1c22', fontSize: 12},
} as const

export function BarsChart({labels, values, height = 210}: {labels: string[]; values: number[]; height?: number}) {
    const ref = useChart({
        tooltip: {...TOOLTIP},
        grid: {left: 8, right: 8, top: 12, bottom: 0, containLabel: true},
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
export function ThresholdChart({approval, support, hours, height = 180}: {approval: Curve; support: Curve; hours: number; height?: number}) {
    // a track running for weeks reads in days while a short one stays in hours
    const unit = hours >= 48 ? 'd' : 'h'
    const span = unit === 'd' ? hours / 24 : hours
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            formatter: (params: unknown) => {
                const list = params as {seriesName?: string; marker?: string; value: [number, number]}[]
                const rows = list
                    .map(p => `<div>${p.marker ?? ''}${p.seriesName ?? ''}<span style="float:right;margin-left:20px;font-weight:600">${p.value[1].toFixed(2)}%</span></div>`)
                    .join('')
                return `<div style="margin-bottom:4px">${list[0].value[0].toFixed(1)}${unit}</div>${rows}`
            },
        },
        legend: {top: 0, right: 0, itemWidth: 18, itemGap: 14, textStyle: {color: SUB, fontSize: 11}},
        grid: {left: 4, right: 10, top: 30, bottom: 0, containLabel: true},
        xAxis: {
            type: 'value',
            min: 0,
            max: span,
            // echarts splits a span with both ends pinned into fifths, which
            // puts the ticks on fractions of a day
            interval: Math.max(1, Math.ceil(span / 7)),
            axisLine: {lineStyle: {color: EDGE}},
            axisTick: {show: false},
            axisLabel: {color: SUB, fontSize: 11, formatter: (v: number) => `${v}${unit}`},
            splitLine: {show: false},
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            interval: 25,
            splitLine: {lineStyle: {color: EDGE}},
            axisLabel: {color: SUB, fontSize: 11, formatter: (v: number) => `${v}%`},
        },
        series: [
            {name: 'Approval', type: 'line', symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: curveSamples(approval, span, SAMPLES)},
            {name: 'Support', type: 'line', symbol: 'none', lineStyle: {width: 2, color: SUPPORT}, itemStyle: {color: SUPPORT}, data: curveSamples(support, span, SAMPLES)},
        ],
    })
    return <div ref={ref} style={{height}} />
}

// a window shades the plot behind the curves and runs a pill along the top,
// the first label the pill is wide enough to hold sitting in a gap of it
function windows(label: string | string[], color: string, fill: string, spans: [number, number][]): echarts.CustomSeriesOption {
    return {
        type: 'custom',
        z: 1,
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
            const text = [label].flat().find(t => x2 - x1 >= echarts.format.getTextRect(t, '11px sans-serif').width + 24)
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

// a step line holds the last recorded value at each hour
function heldAt(steps: [number, number][], grid: number[]): [number, number][] {
    let i = 0
    return grid.map(h => {
        while (i + 1 < steps.length && steps[i + 1][0] <= h) i++
        return [h, steps[i][1]]
    })
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
    currentApproval: [number, number][]
    currentSupport: [number, number][]
    now: {at: number; approval: number; support: number} | null
    confirmations: [number, number][]
    earlyEnd: number | null
    hours: number
    clock: {zero: number; perHour: number; blockTime: number; started: boolean}
    lead: {from: number; submitted: number}
    height?: number
}) {
    const walked = (name: string, data: [number, number][], color: string) => ({
        name,
        type: 'line' as const,
        symbol: 'none',
        step: 'end' as const,
        lineStyle: {width: 2, color, type: 'dashed' as const},
        itemStyle: {color},
        data,
    })
    const blockAt = (h: number) => clock.zero + Math.round(h * clock.perHour)
    // thresholds exist from hour zero on, the tally up to its last step
    const lines = (from: number, to: number) => {
        const grid = [...new Set([...evenly(lead.from, hours), ...evenly(from, to), ...currentApproval.map(([h]) => h)])].sort((a, b) => a - b)
        const deciding = grid.filter(h => h >= 0)
        const tallied = grid.filter(h => h <= currentApproval.at(-1)![0])
        return {
            approval: deciding.map((h): [number, number] => [h, curveAt(approval, h / hours) * 100]),
            support: deciding.map((h): [number, number] => [h, curveAt(support, h / hours) * 100]),
            currentApproval: heldAt(currentApproval, tallied),
            currentSupport: heldAt(currentSupport, tallied),
        }
    }
    const shown = lines(lead.from, hours)
    const opt: echarts.EChartsOption = {
        tooltip: {
            ...TOOLTIP,
            formatter: (params: unknown) => {
                const list = params as {axisValue: number; seriesName?: string; marker?: string; value: [number, number]}[]
                const at = list[0].axisValue
                const h = Math.round(at)
                const head =
                    at < 0
                        ? `Lead-in ${fmtBlockSpan(blockAt(at) - lead.submitted, clock.blockTime)} · #${fmtInt(blockAt(at))}`
                        : clock.started
                          ? `${h}h · #${fmtInt(blockAt(at))}`
                          : `${h}h`
                const rows = [...list]
                    .sort((a, b) => Number(b.seriesName?.toLowerCase().includes('approval')) - Number(a.seriesName?.toLowerCase().includes('approval')))
                    .map(p => `<div>${p.marker ?? ''}${p.seriesName ?? ''}<span style="float:right;margin-left:20px;font-weight:600">${p.value[1].toFixed(2)}%</span></div>`)
                    .join('')
                return `<div style="margin-bottom:4px">${head}</div>${rows}`
            },
        },
        // the legend hangs from its top edge so a wrapped second row grows
        // toward the card edge instead of into the slider above it
        legend: {
            top: height - 46,
            itemWidth: 22,
            itemGap: 18,
            textStyle: {color: SUB, fontSize: 11},
            data: [
                {name: 'Approval'},
                {name: 'Current approval', lineStyle: {type: 'dashed'}},
                {name: 'Support'},
                {name: 'Current support', lineStyle: {type: 'dashed'}},
            ],
        },
        grid: {left: 8, right: 20, top: 32, bottom: 70, containLabel: true},
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
            axisLabel: {color: SUB, fontSize: 11, customValues: ticksIn(lead.from, hours), formatter: (v: number) => `${Math.round(v)}h`},
            splitLine: {show: false},
        },
        yAxis: {
            type: 'value',
            min: 0,
            max: 100,
            interval: 25,
            splitLine: {lineStyle: {color: EDGE}},
            axisLabel: {color: SUB, fontSize: 11, formatter: (v: number) => `${v}%`},
        },
        series: [
            {
                name: 'Support',
                type: 'line',
                symbol: 'none',
                lineStyle: {width: 2, color: SUPPORT},
                itemStyle: {color: SUPPORT},
                data: shown.support,
                markLine: now
                    ? {silent: true, symbol: 'none', label: {show: false}, lineStyle: {color: GRAY, type: 'dashed', width: 1}, data: [{xAxis: now.at}]}
                    : undefined,
            },
            walked('Current support', shown.currentSupport, SUPPORT),
            {name: 'Approval', type: 'line' as const, symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: shown.approval},
            walked('Current approval', shown.currentApproval, GREEN),
            windows([`Lead-in ${fmtBlockSpan(clock.zero - lead.submitted, clock.blockTime)}`, 'Lead-in'], SUB, SUB_FILL, [[lead.from, 0]]),
            windows('Confirmation', GREEN, GREEN_FILL, confirmations),
            windows(now ? 'Ends early' : 'Ended early', SUB, SUB_FILL, earlyEnd !== null ? [[earlyEnd, hours]] : []),
        ],
    }
    // a width cap folds the four legend entries into balanced pairs when
    // the container cannot hold one row. the no-query unit lifts the cap
    // once one row fits again
    const ref = useChart({
        baseOption: opt,
        media: [
            {query: {maxWidth: 470}, option: {legend: {width: 260}}},
            {option: {legend: {width: 'auto'}}},
        ],
    })
    // the hour labels and the line readings follow a zoom a frame later,
    // updating inside the event strands the window labels where the zoom
    // found them
    useEffect(() => {
        const chart = echarts.getInstanceByDom(ref.current!)!
        const refocus = () => {
            requestAnimationFrame(() => {
                const [zoom] = chart.getOption().dataZoom as {start: number; end: number}[]
                const at = (pct: number) => lead.from + ((hours - lead.from) * pct) / 100
                const [from, to] = [at(zoom.start), at(zoom.end)]
                const next = lines(from, to)
                chart.setOption({
                    xAxis: {axisLabel: {customValues: ticksIn(from, to)}},
                    series: [
                        {name: 'Support', data: next.support},
                        {name: 'Current support', data: next.currentSupport},
                        {name: 'Approval', data: next.approval},
                        {name: 'Current approval', data: next.currentApproval},
                    ],
                })
            })
        }
        chart.on('datazoom', refocus)
        // useChart has already disposed the chart when this runs on unmount
        return () => {
            if (!chart.isDisposed()) chart.off('datazoom', refocus)
        }
    }, [ref, lines, lead.from, hours])
    return <div ref={ref} style={{height}} />
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
    const ref = useChart({
        tooltip: {
            ...TOOLTIP,
            formatter: (args: unknown) => {
                const p = (Array.isArray(args) ? args[0] : args) as {axisValueLabel: string; marker: string; dataIndex: number; value: number}
                return `${p.axisValueLabel}<br/>${p.marker} ${name} <b>${tips[p.dataIndex] ?? p.value}</b>`
            },
        },
        grid: {left: 8, right: 16, top: 20, bottom: 58, containLabel: true},
        dataZoom: [
            {type: 'inside'},
            {
                type: 'slider',
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
                labelFormatter: (_: number, s: string) => s,
            },
        ],
        xAxis: catAxis(labels),
        yAxis: valAxis(kind === 'line') as never,
        series: [
            kind === 'bar'
                ? {name, type: 'bar' as const, barMaxWidth: 24, itemStyle: {color: ACCENT_SOFT, borderRadius: [3, 3, 0, 0]}, data: values}
                : {
                      name,
                      type: 'line' as const,
                      smooth: 0.2,
                      symbol: 'none',
                      lineStyle: {width: 2, color: ACCENT},
                      itemStyle: {color: ACCENT},
                      areaStyle: {opacity: 0.07, color: ACCENT},
                      data: values,
                  },
        ],
    })
    return <div ref={ref} style={{height}} />
}

export interface LineSeries {
    name: string
    values: number[]
    color?: string
    area?: boolean
}

export function LinesChart({labels, series, height = 210, dualAxis = false}: {labels: string[]; series: LineSeries[]; height?: number; dualAxis?: boolean}) {
    const ref = useChart({
        tooltip: {...TOOLTIP},
        legend: series.length > 1 ? {top: 0, right: 0, icon: 'circle', itemWidth: 8, itemHeight: 8, textStyle: {color: SUB, fontSize: 11}} : undefined,
        grid: {left: 8, right: 8, top: series.length > 1 ? 28 : 12, bottom: 0, containLabel: true},
        xAxis: catAxis(labels),
        yAxis: dualAxis ? ([valAxis(), {...valAxis(), splitLine: {show: false}}] as never) : (valAxis() as never),
        series: series.map((s, i) => ({
            name: s.name,
            type: 'line' as const,
            smooth: 0.35,
            symbol: 'none',
            yAxisIndex: dualAxis ? i : 0,
            lineStyle: {width: 2, color: s.color ?? (i === 0 ? ACCENT : GRAY)},
            itemStyle: {color: s.color ?? (i === 0 ? ACCENT : GRAY)},
            areaStyle: s.area ? {opacity: 0.08} : undefined,
            data: s.values,
        })),
    })
    return <div ref={ref} style={{height}} />
}
