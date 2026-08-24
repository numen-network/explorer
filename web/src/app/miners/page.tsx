import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import {chainProps} from '@/lib/chain'
import {CONTROL} from '@/lib/ui'
import {fmtBalance, fmtInt} from '@/lib/format'
import {minerDays, type AccountRef} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Miners'}

const WINDOWS = {'24h': 1, '7d': 7, '30d': 30} as const
type WindowKey = keyof typeof WINDOWS

export default async function MinersPage(props: PageProps<'/miners'>) {
    const sp = await props.searchParams
    const w: WindowKey = sp.w === '7d' || sp.w === '30d' ? sp.w : '24h'
    const since = new Date(Date.now() - WINDOWS[w] * 86400000).toISOString().slice(0, 10)
    const [chain, {minerDayStats}] = await Promise.all([chainProps(), minerDays(since)])

    const byMiner = new Map<string, {id: string; acc: AccountRef; blocks: number; rewards: bigint}>()
    for (const d of minerDayStats) {
        const cur = byMiner.get(d.account.id) ?? {id: d.account.id, acc: d.account, blocks: 0, rewards: 0n}
        cur.blocks += d.blocks
        cur.rewards += BigInt(d.rewards)
        byMiner.set(d.account.id, cur)
    }
    const miners = [...byMiner.values()].sort((a, b) => b.blocks - a.blocks)
    const totalBlocks = miners.reduce((n, m) => n + m.blocks, 0)

    return (
        <div>
            <div className="mt-6 flex items-center justify-between">
                <h1 className="text-lg font-semibold">Miners</h1>
                <div className={`${CONTROL} flex overflow-hidden text-sm`}>
                    {(Object.keys(WINDOWS) as WindowKey[]).map(k => (
                        <Link
                            key={k}
                            href={`/miners?w=${k}`}
                            className={`px-3.5 py-1.5 ${k === w ? 'bg-accent font-medium text-white' : 'hover:text-accent'}`}
                        >
                            {k}
                        </Link>
                    ))}
                </div>
            </div>
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)_max-content_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Miner</th>
                            <th className="text-right">Blocks</th>
                            <th>Share</th>
                            <th className="text-right">Rewards</th>
                        </tr>
                    </thead>
                    <tbody>
                        {miners.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-sub">
                                    No blocks in this window.
                                </td>
                            </tr>
                        )}
                        {miners.map((m, i) => {
                            const share = totalBlocks > 0 ? (m.blocks / totalBlocks) * 100 : 0
                            return (
                                <tr key={m.id}>
                                    <td className="font-mono text-sub">{i + 1}</td>
                                    <td>
                                        <AccountLink full addr={ss58Encode(m.id, chain.ss58)} acc={m.acc} />
                                    </td>
                                    <td className="text-right font-mono">{fmtInt(m.blocks)}</td>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <span className="h-1.5 w-40 overflow-hidden rounded-full bg-bg">
                                                <span className="block h-full rounded-full bg-accent" style={{width: `${share.toFixed(1)}%`}} />
                                            </span>
                                            <span className="w-14 font-mono text-xs text-sub">{share.toFixed(2)}%</span>
                                        </div>
                                    </td>
                                    <td className="text-right font-mono">{fmtBalance(m.rewards, chain.decimals, chain.symbol)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-xs text-faint">window boundaries are UTC days</p>
        </div>
    )
}
