import type {ComboSeries} from '@/components/charts'
import {ACCENT, ACCENT_SOFT, GRAY, GREEN, SUPPORT} from './chartColors'
import {fmtApprox, fmtInt, planckToNum} from './format'
import type {AccountDayRow} from './gql'

export const ACCOUNT_CHARTS = [
    ['balance', 'Balance'],
    ['activity', 'Activity'],
    ['fees', 'Fees'],
] as const

const SUMMED = 'summed over each UTC day'

export type AccountChart = (typeof ACCOUNT_CHARTS)[number][0]

export const accountChartOf = (v: unknown): AccountChart => ACCOUNT_CHARTS.find(([k]) => k === v)?.[0] ?? 'balance'

export interface AccountChartView {
    labels: string[]
    series: ComboSeries[]
    total?: {name: string; tips: string[]}
    // which moment or span of the day the values stand for
    note: string
}

interface Day {
    day: string
    // the close this day ends on, carried over from the last day a block touched
    close: AccountDayRow
    // the rows a block wrote on this very day, null on a quiet one
    own: AccountDayRow | null
}

const nextDay = (day: string) => new Date(Date.parse(`${day}T00:00:00Z`) + 86400000).toISOString().slice(0, 10)
const held = (r: AccountDayRow) => BigInt(r.free) + BigInt(r.reserved)

// every day from the window start to until. an account younger than the window
// opens on its first day, an account that started before it opens on the close
// of the last day before
export function accountDaysFilled(rows: AccountDayRow[], prior: AccountDayRow | undefined, since: string, until: string): Day[] {
    const first = prior != null ? since : rows[0]?.day
    if (first == null) return []
    const byDay = new Map(rows.map(r => [r.day, r]))
    const out: Day[] = []
    let close = prior
    for (let day = first; day <= until; day = nextDay(day)) {
        const own = byDay.get(day) ?? null
        close = own ?? close
        out.push({day, close: close!, own})
    }
    return out
}

export function accountChartView(chart: AccountChart, days: Day[], decimals: number, symbol: string): AccountChartView {
    const amounts = (pick: (d: Day) => bigint) => {
        const v = days.map(pick)
        return {values: v.map(p => planckToNum(p, decimals)), tips: v.map(p => fmtApprox(p, decimals, symbol))}
    }
    const counts = (pick: (d: Day) => number) => {
        const v = days.map(pick)
        return {values: v, tips: v.map(fmtInt)}
    }
    const labels = days.map(d => d.day)
    const fee = (d: Day, key: 'feeTreasury' | 'feeMiner' | 'tip') => BigInt(d.own?.[key] ?? 0)
    switch (chart) {
        case 'balance':
            return {
                labels,
                series: [
                    {name: 'Balance', type: 'line', color: ACCENT, area: true, ...amounts(d => held(d.close))},
                    {name: 'Free', type: 'line', color: GREEN, hidden: true, ...amounts(d => BigInt(d.close.free))},
                    {name: 'Reserved', type: 'line', color: GRAY, hidden: true, ...amounts(d => BigInt(d.close.reserved))},
                    {name: 'Frozen', type: 'line', color: SUPPORT, hidden: true, ...amounts(d => BigInt(d.close.frozen))},
                ],
                note: 'at the last block of each UTC day',
            }
        case 'activity':
            return {
                labels,
                series: [
                    {name: 'Extrinsics', type: 'bar', color: ACCENT, ...counts(d => d.own?.extrinsics ?? 0)},
                    {name: 'Transfer-in', type: 'bar', color: GREEN, ...counts(d => d.own?.transfersIn ?? 0)},
                    {name: 'Transfer-out', type: 'bar', color: GRAY, ...counts(d => d.own?.transfersOut ?? 0)},
                ],
                note: SUMMED,
            }
        case 'fees':
            return {
                labels,
                total: {name: 'Fees', tips: days.map(d => fmtApprox(fee(d, 'feeTreasury') + fee(d, 'feeMiner') + fee(d, 'tip'), decimals, symbol))},
                series: [
                    {name: 'To treasury', type: 'bar', color: ACCENT, stack: 'fee', ...amounts(d => fee(d, 'feeTreasury'))},
                    {name: 'To miner', type: 'bar', color: ACCENT_SOFT, stack: 'fee', ...amounts(d => fee(d, 'feeMiner'))},
                    {name: 'Tip', type: 'bar', color: GRAY, stack: 'fee', ...amounts(d => fee(d, 'tip'))},
                ],
                note: SUMMED,
            }
    }
}
