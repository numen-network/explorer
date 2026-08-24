import Link from 'next/link'
import {notFound} from 'next/navigation'
import ChartList from '@/components/ChartList'
import {SeriesChart} from '@/components/charts'
import {chainProps} from '@/lib/chain'
import {CONTROL, FIELD} from '@/lib/ui'
import {CHARTS, chartBySlug, highlight, type ChartInput} from '@/lib/charts'
import {chartSeries} from '@/lib/gql'

export const dynamic = 'force-dynamic'

const DAY = /^\d{4}-\d{2}-\d{2}$/
const RANGES: [key: string, label: string, days: number][] = [
    ['30', '30D', 30],
    ['90', '90D', 90],
    ['365', '365D', 365],
    ['all', 'ALL', 0],
]
const PILL = 'rounded-lg px-2.5 py-1 text-xs'

export async function generateMetadata(props: PageProps<'/charts/[slug]'>) {
    const {slug} = await props.params
    return {title: chartBySlug(slug)?.title ?? 'Charts'}
}

export function generateStaticParams() {
    return CHARTS.map(c => ({slug: c.slug}))
}

export default async function ChartPage(props: PageProps<'/charts/[slug]'>) {
    const {slug} = await props.params
    const def = chartBySlug(slug)
    if (!def) notFound()
    const sp = await props.searchParams
    const str = (v: string | string[] | undefined) => (typeof v === 'string' ? v : '')

    const custom = DAY.test(str(sp.after)) || DAY.test(str(sp.before))
    const range = custom ? '' : (RANGES.find(([k]) => k === str(sp.r))?.[0] ?? '365')
    const days = RANGES.find(([k]) => k === range)?.[2] ?? 0
    const after = custom ? str(sp.after) : days ? new Date(Date.now() - days * 86400000).toISOString().slice(0, 10) : ''
    const before = custom ? str(sp.before) : ''

    const chain = await chainProps()
    const data = await chartSeries(DAY.test(after) ? after : '', DAY.test(before) ? before : '', def.miners === true)

    const input: ChartInput = {
        // the indexer parks a sentinel row at the epoch for counters with no day of their own
        days: data.dailyStats.filter(d => !d.id.startsWith('1970')),
        miners: data.minerDayStats ?? [],
        decimals: chain.decimals,
        symbol: chain.symbol,
    }
    const values = def.values(input)
    const labels = input.days.map(d => d.id)
    const note = highlight(def, values, input)

    return (
        <div className="mt-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
            {/* the list is eighteen entries deep, on a phone it would bury the
                chart the reader just tapped */}
            <ChartList active={slug} className="order-2 lg:order-1" />

            {/* min-w-0 or the grid track widens to fit the date row and takes
                the chart with it */}
            <div className="card order-1 min-w-0 px-5 py-4 lg:order-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <h1 className="text-[17px] font-semibold">{def.title}</h1>
                    <div className="flex flex-wrap items-center gap-2">
                        <form className="flex flex-wrap items-center gap-2 text-xs" action={`/charts/${slug}`}>
                            <input type="date" name="after" defaultValue={custom ? after : ''} className={FIELD} />
                            <span className="text-faint">to</span>
                            <input type="date" name="before" defaultValue={before} className={FIELD} />
                            <button type="submit" className={`${FIELD} hover:text-accent`}>
                                Apply
                            </button>
                        </form>
                        <div className={`${CONTROL} flex items-center gap-1 p-0.5`}>
                            {RANGES.map(([k, label]) => (
                                <Link key={k} href={`/charts/${slug}${k === '365' ? '' : `?r=${k}`}`} className={`${PILL} ${k === range ? 'bg-bg font-medium' : 'text-sub hover:text-accent'}`}>
                                    {label}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="mt-3">
                    {input.days.length === 0 ? (
                        <div className="grid h-[420px] place-items-center text-sm text-faint">No data in this range.</div>
                    ) : (
                        <SeriesChart labels={labels} values={values} tips={values.map(v => def.format(v, input))} name={def.unit} kind={def.kind} />
                    )}
                </div>

                <dl className="mt-4 space-y-1.5 border-t border-edge pt-4 text-sm">
                    <div className="flex gap-4">
                        <dt className="w-16 shrink-0 text-sub">About</dt>
                        <dd className="text-ink">{def.about}</dd>
                    </div>
                    {note && (
                        <div className="flex gap-4">
                            <dt className="w-16 shrink-0 text-sub">Highlight</dt>
                            <dd className="text-ink">{note}</dd>
                        </div>
                    )}
                </dl>
            </div>
        </div>
    )
}
