import Link from 'next/link'
import Pager from '@/components/Pager'
import {EvmAddrLink, EvmTxLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {fmtBalance, shortHash} from '@/lib/format'
import {tokenTransfersFor} from '@/lib/gql'
import {num, tabHref, type TabCtx} from './shared'

const PAGE = 25

export default async function TokenTransfers({addr, evm, sp}: TabCtx & {evm: string}) {
    const page = num(sp, 'kpage')
    const {tokenTransfers, conn} = await tokenTransfersFor(evm, PAGE, (page - 1) * PAGE)

    return (
        <>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_minmax(14ch,1fr)_minmax(14ch,1fr)_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Transaction</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>From</th>
                            <th>To</th>
                            <th>Token</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokenTransfers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-5 text-sub">
                                    None
                                </td>
                            </tr>
                        )}
                        {tokenTransfers.map(t => (
                            <tr key={t.id}>
                                <td>
                                    <EvmTxLink hash={t.transaction.id} />
                                </td>
                                <td className="text-sub">
                                    <TimeCell iso={t.timestamp} />
                                </td>
                                <td>
                                    <EvmAddrLink addr={t.from} />
                                </td>
                                <td>
                                    <EvmAddrLink addr={t.to} />
                                </td>
                                <td>
                                    <Link href={`/token/${t.token.id}`} className="text-accent hover:underline">
                                        {t.token.symbol ?? shortHash(t.token.id, 6, 4)}
                                    </Link>
                                </td>
                                <td className="text-right font-mono">{fmtBalance(t.amount, t.token.decimals ?? 0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {conn.totalCount > PAGE && <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => tabHref(addr, 'tokens', {kpage: n})} />}
        </>
    )
}
