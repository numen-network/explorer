import {TabBar} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {minerDays} from '@/lib/gql'
import {MinersTable, type MinerStat} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Miners'}

const WINDOWS = {'24h': 1, '7d': 7, '30d': 30} as const
type WindowKey = keyof typeof WINDOWS

export default async function MinersPage(props: PageProps<'/miners'>) {
    const sp = await props.searchParams
    const w: WindowKey = sp.w === '7d' || sp.w === '30d' ? sp.w : '24h'
    const since = new Date(Date.now() - WINDOWS[w] * 86400000).toISOString().slice(0, 10)
    const [chain, minerDayStats] = await Promise.all([chainProps(), minerDays(since)])

    const byMiner = new Map<string, MinerStat & {rewards: string}>()
    const rewards = new Map<string, bigint>()
    for (const d of minerDayStats) {
        const cur = byMiner.get(d.account.id) ?? {id: d.account.id, acc: d.account, blocks: 0, rewards: '0'}
        cur.blocks += d.blocks
        rewards.set(d.account.id, (rewards.get(d.account.id) ?? 0n) + BigInt(d.rewards))
        byMiner.set(d.account.id, cur)
    }
    const miners = [...byMiner.values()].map(m => ({...m, rewards: String(rewards.get(m.id) ?? 0n)})).sort((a, b) => b.blocks - a.blocks)
    const totalBlocks = miners.reduce((n, m) => n + m.blocks, 0)

    return (
        <div>
            <div className="mt-6 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Miners</h1>
                <TabBar variant="segment" items={(Object.keys(WINDOWS) as WindowKey[]).map(k => ({label: k, href: `/miners?w=${k}`, active: k === w}))} />
            </div>
            <Card size="flush" className="mt-3">
                <MinersTable rows={miners} totalBlocks={totalBlocks} chain={chain} />
            </Card>
            <p className="mt-2 text-xs text-dim">window boundaries are UTC days</p>
        </div>
    )
}
