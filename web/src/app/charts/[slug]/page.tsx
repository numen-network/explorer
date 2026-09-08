import {notFound} from 'next/navigation'
import ChartList from '@/components/ChartList'
import DateRange from '@/components/DateRange'
import {TabBar} from '@/components/Tabs'
import {SeriesChart} from '@/components/charts'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Empty, EmptyDescription} from '@/components/ui/empty'
import {chainProps} from '@/lib/chain'
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
    const data = await chartSeries(DAY.test(after) ? after : '', DAY.test(before) ? before : '')

    const input: ChartInput = {
        days: data.dailyStats,
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
            <Card className="order-1 min-w-0 gap-3 py-4 [--card-spacing:--spacing(5)] lg:order-2">
                <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="text-[17px] leading-normal font-semibold">{def.title}</CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                        <form className="flex flex-wrap items-center gap-2 text-xs" action={`/charts/${slug}`}>
                            <DateRange after={custom ? after : ''} before={before} />
                            <Button type="submit" variant="outline" className="h-auto rounded-lg bg-card px-2.5 py-1 text-xs font-normal hover:bg-card hover:text-primary">
                                Apply
                            </Button>
                        </form>
                        <TabBar variant="pill" items={RANGES.map(([k, label]) => ({label, href: `/charts/${slug}${k === '365' ? '' : `?r=${k}`}`, active: k === range}))} />
                    </div>
                </CardHeader>
                <CardContent>
                    {input.days.length === 0 ? (
                        <Empty className="h-[420px] p-0 text-wrap">
                            <EmptyDescription className="text-sm text-dim">No data in this range.</EmptyDescription>
                        </Empty>
                    ) : (
                        <SeriesChart labels={labels} values={values} tips={values.map(v => def.format(v, input))} name={def.unit} kind={def.kind} />
                    )}
                    <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                        <div className="flex gap-4">
                            <dt className="w-16 shrink-0 text-muted-foreground">About</dt>
                            <dd>{def.about}</dd>
                        </div>
                        {note && (
                            <div className="flex gap-4">
                                <dt className="w-16 shrink-0 text-muted-foreground">Highlight</dt>
                                <dd>{note}</dd>
                            </div>
                        )}
                    </dl>
                </CardContent>
            </Card>
        </div>
    )
}
