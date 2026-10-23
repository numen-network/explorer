import SegmentedControl from '@/components/SegmentedControl'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps, windowStart} from '@/lib/chain'
import {minerDays} from '@/lib/gql'
import {rankMiners} from '@/lib/miners'
import {MinersTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Miners'}

const WINDOWS = {'24h': 1, '7d': 7, '30d': 30} as const
type WindowKey = keyof typeof WINDOWS

export default async function MinersPage(props: PageProps<'/miners'>) {
    const sp = await props.searchParams
    const w: WindowKey = sp.w === '7d' || sp.w === '30d' ? sp.w : '24h'
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const minerDayStats = await minerDays(windowStart(head, WINDOWS[w])?.slice(0, 10) ?? null)

    const {miners, totalBlocks} = rankMiners(minerDayStats)

    return (
        <div>
            <div className="mt-6 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Miners</h1>
                <SegmentedControl aria-label="Window" options={(Object.keys(WINDOWS) as WindowKey[]).map(k => ({label: k, href: `/miners?w=${k}`, active: k === w}))} />
            </div>
            <Card size="flush" className="mt-3">
                <MinersTable rows={miners} totalBlocks={totalBlocks} chain={chain} />
            </Card>
            <p className="mt-2 text-xs text-dim">window boundaries are UTC days</p>
        </div>
    )
}
