import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {StatusDot} from '@/components/pills'
import {chainProps} from '@/lib/chain'
import {shortHash} from '@/lib/format'
import {blocksPage} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Blocks'}

const PAGE = 25

export default async function BlocksPage(props: PageProps<'/blocks'>) {
    const sp = await props.searchParams
    const page = Math.max(1, Number(sp.page) || 1)
    const [chain, {blocks, conn}] = await Promise.all([chainProps(), blocksPage(PAGE, (page - 1) * PAGE)])

    return (
        <div>
            <Refresh />
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Blocks</h1>
            </div>
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_max-content_minmax(18ch,1fr)_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Height</th>
                            <th>Hash</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>Status</th>
                            <th>Miner</th>
                            <th className="text-right">Extrinsics</th>
                            <th className="text-right">Events</th>
                        </tr>
                    </thead>
                    <tbody>
                        {blocks.map(b => (
                            <tr key={b.id}>
                                <td>
                                    <BlockLink height={b.height} />
                                </td>
                                <td className="font-mono text-xs text-sub" title={b.hash}>
                                    {shortHash(b.hash, 8, 6)}
                                </td>
                                <td className="text-sub">
                                    <TimeCell iso={b.timestamp} />
                                </td>
                                <td>
                                    <span className="flex items-center gap-1.5">
                                        <StatusDot tone={b.finalized ? 'pos' : 'warn'} />
                                        <span className="text-xs">{b.finalized ? 'Finalized' : 'Confirming'}</span>
                                    </span>
                                </td>
                                <td>
                                    {b.author ? <AccountLink full addr={ss58Encode(b.author.id, chain.ss58)} acc={b.author} /> : <span className="text-faint">—</span>}
                                </td>
                                <td className="text-right font-mono">{b.extrinsicCount}</td>
                                <td className="text-right font-mono">{b.eventCount}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => `/blocks?page=${n}`} />
        </div>
    )
}
