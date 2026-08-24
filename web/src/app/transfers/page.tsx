import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import AccountLink from '@/components/AccountLink'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {CallPill} from '@/components/calls'
import {chainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import {transfersPage} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Transfers'}

const PAGE = 25

export default async function TransfersPage(props: PageProps<'/transfers'>) {
    const sp = await props.searchParams
    const page = Math.max(1, Number(sp.page) || 1)
    const [chain, {transfers, conn}] = await Promise.all([chainProps(), transfersPage(PAGE, (page - 1) * PAGE)])

    return (
        <div>
            <Refresh />
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Transfers</h1>
                <span className="text-xs text-sub">{fmtInt(conn.totalCount)} total</span>
            </div>
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(18ch,max-content)_minmax(18ch,1fr)_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Extrinsic</th>
                            <th>Block</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>From</th>
                            <th>To</th>
                            <th className="text-right">Amount</th>
                            <th className="text-right">Call</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-6 text-sub">
                                    No transfers yet.
                                </td>
                            </tr>
                        )}
                        {transfers.map(t => (
                            <tr key={t.id}>
                                <td>
                                    {t.extrinsic ? <ExtrinsicLink id={t.extrinsic.id} hash={t.extrinsic.hash} /> : <span className="text-faint">—</span>}
                                </td>
                                <td>
                                    <BlockLink height={t.block.height} />
                                </td>
                                <td className="text-sub">
                                    <TimeCell iso={t.timestamp} />
                                </td>
                                <td>
                                    <AccountLink addr={ss58Encode(t.from.id, chain.ss58)} acc={t.from} />
                                </td>
                                <td>
                                    <AccountLink addr={ss58Encode(t.to.id, chain.ss58)} acc={t.to} />
                                </td>
                                <td className="text-right font-mono">{fmtBalance(t.amount, chain.decimals, chain.symbol)}</td>
                                <td className="text-right">
                                    <CallPill call={t.call} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pager page={page} pageCount={Math.max(1, Math.ceil(conn.totalCount / PAGE))} href={n => `/transfers?page=${n}`} />
        </div>
    )
}
