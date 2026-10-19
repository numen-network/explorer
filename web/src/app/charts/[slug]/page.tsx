import {notFound} from 'next/navigation'
import ChartList from '@/components/ChartList'
import ChartRange, {chartWindow} from '@/components/ChartRange'
import {SeriesChart} from '@/components/charts'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Empty, EmptyDescription} from '@/components/ui/empty'
import {chainDbHead, chainProps} from '@/lib/chain'
import {CHARTS, chartBySlug, highlight, type ChartInput} from '@/lib/charts'
import {chartSeries} from '@/lib/gql'

export const dynamic = 'force-dynamic'

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
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const win = chartWindow(await props.searchParams, head)
    const data = await chartSeries(win.since, win.before)

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
                    <ChartRange win={win} head={head} action={`/charts/${slug}`} href={r => `/charts/${slug}${r ? `?r=${r}` : ''}`} />
                </CardHeader>
                <CardContent>
                    {input.days.length === 0 ? (
                        <Empty className="h-[420px] p-0 text-wrap">
                            <EmptyDescription className="text-sm text-dim">No data in this range.</EmptyDescription>
                        </Empty>
                    ) : (
                        <SeriesChart labels={labels} values={values.map(v => def.plot(v, input))} tips={values.map(v => def.format(v, input))} name={def.unit} kind={def.kind} />
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
