import SegmentedControl from '@/components/SegmentedControl'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps, windowStart} from '@/lib/chain'
import {heightsByAuthor, minerDays, type MinerDayWhere} from '@/lib/gql'
import {rankMiners} from '@/lib/miners'
import {MinersTable} from './table'
import {withHeads} from '@/components/withHeads'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Miners'}

const WINDOWS = {'24h': 1, '7d': 7, '30d': 30, all: null} as const
type WindowKey = keyof typeof WINDOWS
const LABEL: Record<WindowKey, string> = {'24h': '24h', '7d': '7d', '30d': '30d', all: 'All'}

async function MinersPage(props: PageProps<'/miners'>) {
    const sp = await props.searchParams
    const w: WindowKey = sp.w === '7d' || sp.w === '30d' || sp.w === 'all' ? sp.w : '24h'
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const days = WINDOWS[w]
    const where: MinerDayWhere = days == null ? {} : {day_gte: windowStart(head, days)?.slice(0, 10) ?? null}
    const {miners, totalBlocks} = rankMiners(await minerDays(where))
    const heights = await heightsByAuthor(miners.map(m => m.acc.lastMinedTimestamp))

    return (
        <div>
            <div className="mt-6 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Miners</h1>
                <SegmentedControl aria-label="Window" options={(Object.keys(WINDOWS) as WindowKey[]).map(k => ({label: LABEL[k], href: `/miners?w=${k}`, active: k === w}))} />
            </div>
            <Card size="flush" className="mt-3">
                <MinersTable rows={miners} heights={heights} totalBlocks={totalBlocks} chain={chain} />
            </Card>
            <p className="mt-2 text-xs text-dim">window boundaries are UTC days</p>
        </div>
    )
}

export default withHeads(MinersPage)
