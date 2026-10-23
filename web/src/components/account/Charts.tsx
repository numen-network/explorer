import ChartRange, {chartWindow, DEFAULT_RANGE} from '@/components/ChartRange'
import SegmentedControl from '@/components/SegmentedControl'
import {ComboChart} from '@/components/charts'
import {Card, CardContent, CardHeader} from '@/components/ui/card'
import {Empty, EmptyDescription} from '@/components/ui/empty'
import {ACCOUNT_CHARTS, accountChartOf, accountChartView, accountDaysFilled} from '@/lib/accountCharts'
import {chainDbHead} from '@/lib/chain'
import {accountDays} from '@/lib/gql'
import {tabHref, type TabCtx} from './shared'

export default async function Charts({hex, addr, chain, sp}: TabCtx) {
    const head = await chainDbHead()
    const win = chartWindow(sp, head)
    const chart = accountChartOf(sp.chart)
    const until = win.before || (head.timestamp?.slice(0, 10) ?? '')
    const {days, prior} = await accountDays(hex, win.since, until)
    const filled = accountDaysFilled(days, prior[0], win.since, until)
    const view = accountChartView(chart, filled, chain.decimals, chain.symbol, BigInt(chain.existentialDeposit))
    // the default chart and range stay out of the url
    const keep: Record<string, string> = chart === 'balance' ? {} : {chart}
    const range: Record<string, string> = win.custom ? {after: win.after, before: win.before} : {r: win.range === DEFAULT_RANGE ? '' : win.range}

    return (
        <Card className="min-w-0 gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader className="flex flex-wrap items-center justify-between gap-3">
                <SegmentedControl aria-label="Chart" options={ACCOUNT_CHARTS.map(([k, label]) => ({label, href: tabHref(addr, 'charts', {...range, chart: k === 'balance' ? '' : k}), active: k === chart}))} />
                <ChartRange win={win} head={head} action={`/account/${addr}`} keep={{tab: 'charts', ...keep}} href={r => tabHref(addr, 'charts', {...keep, r: r ?? ''})} />
            </CardHeader>
            <CardContent>
                {filled.length === 0 ? (
                    <Empty className="h-[380px] p-0 text-wrap">
                        <EmptyDescription className="text-sm text-dim">No data in this range.</EmptyDescription>
                    </Empty>
                ) : (
                    <ComboChart key={chart} {...view} />
                )}
            </CardContent>
        </Card>
    )
}
