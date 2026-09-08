'use client'
import {curveSamples, type Curve} from '@/lib/curves'
import {fmtCompact, fmtInt} from '@/lib/format'
import * as echarts from 'echarts'
import {useEffect, useRef} from 'react'

const SUB = '#7c828e'
const EDGE = '#e8eaef'
const ACCENT = '#0891b2'
const ACCENT_SOFT = '#c4e5ed'
const GRAY = '#9aa1ad'
const GREEN = '#4caf50'
const SUPPORT = '#7c3aed'

function useChart(build: () => echarts.EChartsOption, deps: unknown[]) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = ref.current
        if (!el) return
        const chart = echarts.init(el)
        chart.setOption(build())
        const ro = new ResizeObserver(() => chart.resize())
        ro.observe(el)
        return () => {
            ro.disconnect()
            chart.dispose()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)
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
    const ref = useChart(
        () => ({
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
        }),
        [labels.join(), values.join()]
    )
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
    const ref = useChart(
        () => ({
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
        }),
        [JSON.stringify(approval), JSON.stringify(support), hours]
    )
    return <div ref={ref} style={{height}} />
}

// the threshold curves run the whole decision period, the dashed pair steps
// through the recorded tally history
export function CurvesChart({
    approval,
    support,
    currentApproval,
    currentSupport,
    now,
    hours,
    deciding,
    height = 320,
}: {
    approval: [number, number][]
    support: [number, number][]
    currentApproval: [number, number][]
    currentSupport: [number, number][]
    now: {at: number; approval: number; support: number} | null
    hours: number
    deciding: {start: number; perHour: number} | null
    height?: number
}) {
    const ref = useChart(() => {
        const walked = (name: string, data: [number, number][], color: string) => ({
            name,
            type: 'line' as const,
            symbol: 'none',
            step: 'end' as const,
            lineStyle: {width: 2, color, type: 'dashed' as const},
            itemStyle: {color},
            data,
        })
        const hasCurrent = currentApproval.length > 0 || currentSupport.length > 0
        const opt: echarts.EChartsOption = {
            tooltip: {
                ...TOOLTIP,
                formatter: (params: unknown) => {
                    const list = params as {seriesName?: string; marker?: string; value: [number, number]}[]
                    const h = Math.round(list[0].value[0])
                    const head = deciding ? `${h}h · #${fmtInt(deciding.start + Math.round(h * deciding.perHour))}` : `${h}h`
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
                data: hasCurrent
                    ? [
                          {name: 'Approval'},
                          {name: 'Current approval', lineStyle: {type: 'dashed'}},
                          {name: 'Support'},
                          {name: 'Current support', lineStyle: {type: 'dashed'}},
                      ]
                    : [{name: 'Approval'}, {name: 'Support'}],
            },
            grid: {left: 8, right: 20, top: 16, bottom: 70, containLabel: true},
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
                min: 0,
                max: hours,
                interval: 24 * Math.ceil(hours / (24 * 7)),
                axisLine: {lineStyle: {color: EDGE}},
                axisTick: {show: false},
                axisLabel: {color: SUB, fontSize: 11, formatter: (v: number) => `${Math.round(v)}h`},
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
                    data: support,
                    markLine: now
                        ? {silent: true, symbol: 'none', label: {show: false}, lineStyle: {color: GRAY, type: 'dashed', width: 1}, data: [{xAxis: now.at}]}
                        : undefined,
                },
                ...(hasCurrent ? [walked('Current support', currentSupport, SUPPORT)] : []),
                {name: 'Approval', type: 'line' as const, symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: approval},
                ...(hasCurrent ? [walked('Current approval', currentApproval, GREEN)] : []),
            ],
        }
        // a width cap folds the four legend entries into balanced pairs when
        // the container cannot hold one row. the no-query unit lifts the cap
        // once one row fits again
        return {
            baseOption: opt,
            media: [
                {query: {maxWidth: 470}, option: {legend: {width: 260}}},
                {option: {legend: {width: 'auto'}}},
            ],
        }
    }, [approval.length, support.length, hours, deciding?.start, deciding?.perHour, now?.at, now?.approval, now?.support, currentApproval.map(p => p.join()).join('|'), currentSupport.map(p => p.join()).join('|')])
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
    const ref = useChart(
        () => ({
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
        }),
        [labels.join(), values.join(), tips.join(), name, kind]
    )
    return <div ref={ref} style={{height}} />
}

export interface LineSeries {
    name: string
    values: number[]
    color?: string
    area?: boolean
}

export function LinesChart({labels, series, height = 210, dualAxis = false}: {labels: string[]; series: LineSeries[]; height?: number; dualAxis?: boolean}) {
    const ref = useChart(
        () => ({
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
        }),
        [labels.join(), series.map(s => s.name + s.values.join()).join('|'), dualAxis]
    )
    return <div ref={ref} style={{height}} />
}
