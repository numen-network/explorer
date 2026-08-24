import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import StatTile from '@/components/StatTile'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink, EvmAddrLink, EvmTxLink} from '@/components/links'
import {isH160} from '@/lib/evm'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {tokenDetail} from '@/lib/gql'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/token/[address]'>) {
    const {address} = await props.params
    return {title: `Token ${shortHash(address, 8, 6)}`}
}

export default async function TokenPage(props: PageProps<'/token/[address]'>) {
    const {address: raw} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    if (!isH160(raw)) notFound()
    const address = raw.toLowerCase()
    const data = await tokenDetail(address)
    const token = data.tokenById
    if (!token) notFound()
    const supply = BigInt(token.totalSupply)
    const dec = token.decimals ?? 0

    const holders = (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)_max-content_max-content]">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Address</th>
                        <th className="text-right">Balance</th>
                        <th className="text-right">Share</th>
                    </tr>
                </thead>
                <tbody>
                    {data.tokenHolders.map((h, i) => {
                        const share = supply > 0n ? Number((BigInt(h.balance) * 10000n) / supply) / 100 : 0
                        return (
                            <tr key={h.id}>
                                <td className="font-mono text-sub">{i + 1}</td>
                                <td>
                                    <EvmAddrLink addr={h.address} full />
                                </td>
                                <td className="text-right font-mono">{fmtBalance(h.balance, dec, token.symbol ?? undefined)}</td>
                                <td className="text-right">
                                    <div className="inline-flex items-center gap-2">
                                        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-bg">
                                            <span className="block h-full rounded-full bg-accent" style={{width: `${Math.min(100, share)}%`}} />
                                        </span>
                                        <span className="w-14 text-right font-mono text-xs text-sub">{share.toFixed(2)}%</span>
                                    </div>
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )

    const transfers = (
        <div className="card divide-y divide-edge">
            {data.tokenTransfers.length === 0 && <div className="px-5 py-5 text-sm text-sub">None</div>}
            {data.tokenTransfers.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <BlockLink height={t.block.height} />
                    <EvmTxLink hash={t.transaction.id} />
                    <span className="font-mono text-xs text-sub">
                        {shortHash(t.from, 6, 4)} → {shortHash(t.to, 6, 4)}
                    </span>
                    <span className="ml-auto font-mono">{fmtBalance(t.amount, dec, token.symbol ?? undefined)}</span>
                    <span className="shrink-0 text-right text-xs text-sub">
                        <TimeCell iso={t.timestamp} cycle />
                    </span>
                </div>
            ))}
        </div>
    )

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">
                    {token.name ?? 'Token'} {token.symbol && <span className="text-sm font-normal text-sub">{token.symbol}</span>}
                </h1>
                <div className="mt-1 font-mono text-[13px] break-all text-sub">
                    <Link href={`/evm/address/${token.id}`} className="text-accent hover:underline">
                        {token.id}
                    </Link>
                    <CopyBtn text={token.id} />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Total supply" value={fmtBalance(token.totalSupply, dec, token.symbol ?? undefined)} />
                <StatTile label="Holders" value={fmtInt(token.holderCount)} />
                <StatTile label="Transfers" value={fmtInt(token.transferCount)} />
                <StatTile
                    label={token.deployBlock != null ? 'Deployed at' : 'First seen'}
                    value={<BlockLink height={token.deployBlock ?? token.firstBlock} />}
                />
            </div>

            <TabPanels
                at={tab}
                href={s => `/token/${address}?tab=${s}`}
                panels={[
                    {slug: 'holders', label: 'Top holders', count: data.tokenHolders.length, body: () => holders},
                    {slug: 'transfers', label: 'Recent transfers', count: data.tokenTransfers.length, body: () => transfers},
                ]}
            />
        </div>
    )
}
