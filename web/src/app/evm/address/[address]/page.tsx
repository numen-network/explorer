import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {AddrMark} from '@/components/addrHot'
import {TabPanels, type Panel} from '@/components/Tabs'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink, EvmAddrLink, EvmTxLink, Jump} from '@/components/links'
import {Tag} from '@/components/pills'
import {chainProps} from '@/lib/chain'
import {evmMappedAccount, evmTxTypeLabel, isH160} from '@/lib/evm'
import {fmtBalance, shortHash} from '@/lib/format'
import {evmAddressData} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/evm/address/[address]'>) {
    const {address} = await props.params
    return {title: `EVM ${shortHash(address, 8, 6)}`}
}

export default async function EvmAddressPage(props: PageProps<'/evm/address/[address]'>) {
    const {address: raw} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    if (!isH160(raw)) notFound()
    const address = raw.toLowerCase()
    const [chain, data] = await Promise.all([chainProps(), evmAddressData(address)])
    const mapped = ss58Encode(evmMappedAccount(address), chain.ss58)
    const isContract = data.created.length > 0 || data.asToken !== null

    const holdings = (
        <div className="card divide-y divide-edge">
            {data.holdings.map(h => (
                <div key={h.token.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <Link href={`/token/${h.token.id}`} className="font-medium text-accent hover:underline">
                        {h.token.name ?? shortHash(h.token.id, 8, 6)}
                    </Link>
                    <span className="text-xs text-sub">{h.token.symbol}</span>
                    <span className="ml-auto font-mono">{fmtBalance(h.balance, h.token.decimals ?? 0, h.token.symbol ?? undefined)}</span>
                </div>
            ))}
        </div>
    )

    const txs = (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Hash</th>
                        <th>Block</th>
                        <th>
                            <TimeModeButton />
                        </th>
                        <th>From</th>
                        <th>To</th>
                        <th>Type</th>
                        <th className="text-right">Value</th>
                        <th className="text-right">Result</th>
                    </tr>
                </thead>
                <tbody>
                    {data.txs.length === 0 && (
                        <tr>
                            <td colSpan={8} className="py-6 text-sub">
                                No transactions.
                            </td>
                        </tr>
                    )}
                    {data.txs.map(tx => (
                        <tr key={tx.id}>
                            <td>
                                <EvmTxLink hash={tx.id} />
                            </td>
                            <td>
                                <BlockLink height={tx.block.height} />
                            </td>
                            <td className="text-sub">
                                <TimeCell iso={tx.timestamp} />
                            </td>
                            <td>
                                <EvmAddrLink addr={tx.from} />
                            </td>
                            <td>
                                {tx.to ? <EvmAddrLink addr={tx.to} /> : tx.contractAddress ? <span className="text-xs">create → <EvmAddrLink addr={tx.contractAddress} /></span> : <span className="text-faint">—</span>}
                            </td>
                            <td className="text-xs">{evmTxTypeLabel(tx.txType)}</td>
                            <td className="text-right font-mono">{fmtBalance(tx.value, chain.decimals)}</td>
                            <td className="text-right">
                                <Tag text={tx.status === 'Succeed' ? 'OK' : tx.status} tone={tx.status === 'Succeed' ? 'pos' : 'neg'} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    const panels: Panel[] = [{slug: 'txs', label: 'Transactions', count: data.txs.length, body: () => txs}]
    if (data.holdings.length > 0) panels.push({slug: 'holdings', label: 'Token holdings', count: data.holdings.length, body: () => holdings})

    return (
        <div>
            <div className="mt-6">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-semibold">EVM address</h1>
                    {isContract && <Tag text="Contract" tone="accent" />}
                    {data.asToken && (
                        <Link href={`/token/${address}`} className="text-sm text-accent hover:underline">
                            {data.asToken.name ?? 'Token'} {data.asToken.symbol ? `(${data.asToken.symbol})` : ''} <Jump />
                        </Link>
                    )}
                </div>
                <div className="mt-1 font-mono text-[13px] break-all text-sub">
                    <AddrMark addr={address}>{address}</AddrMark>
                    <CopyBtn text={address} />
                </div>
                <div className="mt-1 text-[13px] text-sub">
                    Mapped substrate account{' '}
                    <Link href={`/account/${mapped}`} className="font-mono text-accent hover:underline">
                        {mapped}
                    </Link>
                    <span className="ml-2 text-xs text-faint">one way, balances live there</span>
                </div>
            </div>

            <TabPanels at={tab} href={s => `/evm/address/${address}?tab=${s}`} panels={panels} />
        </div>
    )
}
