import Form from 'next/form'
import ApplyButton from '@/components/ApplyButton'
import DateRange from '@/components/DateRange'
import {TabNav} from '@/components/Tabs'
import {windowStart, type DbHead} from '@/lib/chain'
import {isDay} from '@/lib/day'

export const RANGES: [key: string, label: string, days: number][] = [
    ['30', '30D', 30],
    ['90', '90D', 90],
    ['365', '365D', 365],
    ['all', 'ALL', 0],
]

export const DEFAULT_RANGE = '365'

export interface ChartWindow {
    after: string
    before: string
    // a picked date range, which no range pill matches
    custom: boolean
    range: string
    // the first day in view, empty for no lower bound
    since: string
}

export function chartWindow(sp: Record<string, string | string[] | undefined>, head: DbHead): ChartWindow {
    const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')
    const after = isDay(str(sp.after)) ? str(sp.after) : ''
    const before = isDay(str(sp.before)) ? str(sp.before) : ''
    const custom = Boolean(after || before)
    const range = custom ? '' : (RANGES.find(([k]) => k === str(sp.r))?.[0] ?? DEFAULT_RANGE)
    const days = RANGES.find(([k]) => k === range)?.[2] ?? 0
    const since = custom ? after : days ? (windowStart(head, days)?.slice(0, 10) ?? '') : ''
    return {after, before, custom, range, since}
}

// the date picker submits to action with keep riding along, a range pill is a
// link from href, which leaves the key out for the default range
export default function ChartRange({win, head, action, keep = {}, href}: {win: ChartWindow; head: DbHead; action: string; keep?: Record<string, string>; href: (range: string | null) => string}) {
    return (
        <div className="flex flex-wrap items-center gap-2">
            <Form className="flex flex-wrap items-center gap-2 text-xs" action={action} scroll={false}>
                {Object.entries(keep).map(([k, v]) => (
                    <input key={k} type="hidden" name={k} value={v} />
                ))}
                <DateRange key={`${win.after}|${win.before}`} after={win.after} before={win.before} lastDay={head.timestamp?.slice(0, 10) ?? null} active={win.custom} />
                <ApplyButton />
            </Form>
            <TabNav aria-label="Range" variant="pill" items={RANGES.map(([k, label]) => ({label, href: href(k === DEFAULT_RANGE ? null : k), active: k === win.range}))} />
        </div>
    )
}
