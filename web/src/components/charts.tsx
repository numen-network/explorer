'use client'
import * as echarts from 'echarts'
import {useEffect, useRef} from 'react'

const SUB = '#7c828e'
const EDGE = '#e8eaef'
const ACCENT = '#0891b2'
const ACCENT_SOFT = '#c4e5ed'
const GRAY = '#9aa1ad'
const GREEN = '#4caf50'

function compact(v: number): string {
    const abs = Math.abs(v)
    if (abs >= 1e9) return (v / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
    if (abs >= 1e6) return (v / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
    if (abs >= 1e4) return (v / 1e3).toFixed(1).replace(/\.0$/, '') + 'K'
    return String(v)
}

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
        axisLabel: {color: SUB, fontSize: 11, formatter: compact},
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

// the threshold curves run the whole decision period, the dashed pair holds
// where the referendum actually stands and stops at the current hour
export function CurvesChart({
    approval,
    support,
    now,
    hours,
    height = 320,
}: {
    approval: [number, number][]
    support: [number, number][]
    now: {at: number; approval: number; support: number} | null
    hours: number
    height?: number
}) {
    const ref = useChart(() => {
        const flat = (name: string, value: number, color: string) => ({
            name,
            type: 'line' as const,
            symbol: 'none',
            lineStyle: {width: 2, color, type: 'dashed' as const},
            itemStyle: {color},
            data: [
                [0, value],
                [now!.at, value],
            ],
        })
        return {
            tooltip: {...TOOLTIP, valueFormatter: (v: unknown) => `${Number(v).toFixed(2)}%`},
            legend: {
                bottom: 0,
                itemWidth: 22,
                itemGap: 18,
                textStyle: {color: SUB, fontSize: 11},
                data: now
                    ? [
                          {name: 'Support'},
                          {name: 'Current support', lineStyle: {type: 'dashed'}},
                          {name: 'Approval'},
                          {name: 'Current approval', lineStyle: {type: 'dashed'}},
                      ]
                    : [{name: 'Support'}, {name: 'Approval'}],
            },
            grid: {left: 8, right: 20, top: 16, bottom: 62, containLabel: true},
            dataZoom: [
                {type: 'inside'},
                {
                    type: 'slider',
                    bottom: 28,
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
                interval: hours / 3,
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
                    lineStyle: {width: 2, color: ACCENT},
                    itemStyle: {color: ACCENT},
                    data: support,
                    markLine: now
                        ? {silent: true, symbol: 'none', label: {show: false}, lineStyle: {color: GRAY, type: 'dashed', width: 1}, data: [{xAxis: now.at}]}
                        : undefined,
                },
                ...(now ? [flat('Current support', now.support, ACCENT)] : []),
                {name: 'Approval', type: 'line' as const, symbol: 'none', lineStyle: {width: 2, color: GREEN}, itemStyle: {color: GREEN}, data: approval},
                ...(now ? [flat('Current approval', now.approval, GREEN)] : []),
            ],
        }
    }, [approval.length, support.length, hours, now?.at, now?.approval, now?.support])
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
