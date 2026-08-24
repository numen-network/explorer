import Link from 'next/link'
import Pager from '@/components/Pager'
import {BlockLink, EvmAddrLink} from '@/components/links'
import {chainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import {tokensPage} from '@/lib/gql'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Tokens'}

const PAGE = 25

export default async function TokensPage(props: PageProps<'/tokens'>) {
    const sp = await props.searchParams
    const page = Math.max(1, Number(sp.page) || 1)
    await chainProps()
    const {tokens, conn} = await tokensPage(PAGE, (page - 1) * PAGE)

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">ERC20 tokens</h1>
                <span className="text-xs text-sub">{fmtInt(conn.totalCount)} contracts</span>
            </div>
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Token</th>
                            <th>Contract</th>
                            <th className="text-right">Total supply</th>
                            <th className="text-right">Holders</th>
                            <th className="text-right">Transfers</th>
                            <th className="text-right">First seen</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokens.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-6 text-sub">
                                    No tokens seen yet.
                                </td>
                            </tr>
                        )}
                        {tokens.map(t => (
                            <tr key={t.id}>
                                <td>
                                    <Link href={`/token/${t.id}`} className="text-accent hover:underline">
                                        <span className="font-medium">{t.name ?? 'Unknown'}</span>
                                        {t.symbol && <span className="ml-1.5 text-xs">{t.symbol}</span>}
                                    </Link>
                                </td>
                                <td>
                                    <EvmAddrLink addr={t.id} />
                                </td>
                                <td className="text-right font-mono">{fmtBalance(t.totalSupply, t.decimals ?? 0, t.symbol ?? undefined)}</td>
                                <td className="text-right font-mono">{fmtInt(t.holderCount)}</td>
                                <td className="text-right font-mono">{fmtInt(t.transferCount)}</td>
                                <td className="text-right">
                                    <BlockLink height={t.deployBlock ?? t.firstBlock} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {conn.totalCount > PAGE && <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => `/tokens?page=${n}`} />}
        </div>
    )
}
