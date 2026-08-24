import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow} from '@/components/Detail'
import {TabPanels, type Panel} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink, EvmAddrLink, ExtrinsicLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {chainProps} from '@/lib/chain'
import {evmTxTypeLabel} from '@/lib/evm'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {evmTxDetail} from '@/lib/gql'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/evm/tx/[hash]'>) {
    const {hash} = await props.params
    return {title: `EVM Tx ${shortHash(hash, 10, 6)}`}
}

export default async function EvmTxPage(props: PageProps<'/evm/tx/[hash]'>) {
    const {hash} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    const [chain, data] = await Promise.all([chainProps(), evmTxDetail(hash.toLowerCase())])
    const tx = data.evmTransactionById
    if (!tx) notFound()
    const ok = tx.status === 'Succeed'
    const fee = BigInt(tx.gasUsed) * BigInt(tx.gasPrice)

    const logs = (
        <div className="card divide-y divide-edge">
            {data.evmLogs.length === 0 && <div className="px-5 py-5 text-sm text-sub">None</div>}
            {data.evmLogs.map(log => (
                <div key={log.id} className="space-y-1 px-5 py-3 font-mono text-xs">
                    <div>
                        <span className="text-sub">#{log.logIndex}</span> <EvmAddrLink addr={log.address} full />
                    </div>
                    {log.topics.map((t, i) => (
                        <div key={i} className="break-all text-sub">
                            <span className="text-faint">topic{i}</span> {t}
                        </div>
                    ))}
                    {log.data !== '0x' && <div className="break-all text-sub">data {log.data}</div>}
                </div>
            ))}
        </div>
    )

    const tokenTransfers = (
        <div className="card divide-y divide-edge">
            {data.tokenTransfers.map(t => (
                <div key={t.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                    <EvmAddrLink addr={t.from} />
                    <span className="text-sub">→</span>
                    <EvmAddrLink addr={t.to} />
                    <span className="ml-auto font-mono">{fmtBalance(t.amount, t.token.decimals ?? 0, t.token.symbol ?? undefined)}</span>
                    <Link href={`/token/${t.token.id}`} className="font-mono text-xs text-accent hover:underline">
                        {shortHash(t.token.id, 6, 4)}
                    </Link>
                </div>
            ))}
        </div>
    )

    const panels: Panel[] = [{slug: 'logs', label: 'Logs', count: data.evmLogs.length, body: () => logs}]
    if (data.tokenTransfers.length > 0) panels.unshift({slug: 'transfers', label: 'Token transfers', count: data.tokenTransfers.length, body: () => tokenTransfers})

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <h1 className="text-lg font-semibold">EVM Transaction</h1>
                <Tag text={ok ? 'Success' : `${tx.status}${tx.statusReason ? ` · ${tx.statusReason}` : ''}`} tone={ok ? 'pos' : 'neg'} />
            </div>

            <div className="mt-3">
                <DetailCard>
                    <DetailRow label="Hash">
                        {tx.id}
                        <CopyBtn text={tx.id} />
                    </DetailRow>
                    <DetailRow label="Block">
                        <BlockLink height={tx.block.height} /> <span className="text-sub">· index {tx.txIndex}</span>
                    </DetailRow>
                    <DetailRow label="Timestamp">
                        <TimeCell iso={tx.timestamp} cycle />
                    </DetailRow>
                    <DetailRow label="From">
                        <EvmAddrLink addr={tx.from} full />
                    </DetailRow>
                    {tx.to && (
                        <DetailRow label="To">
                            <EvmAddrLink addr={tx.to} full />
                        </DetailRow>
                    )}
                    {tx.contractAddress && (
                        <DetailRow label="Contract created">
                            <EvmAddrLink addr={tx.contractAddress} full />
                        </DetailRow>
                    )}
                    <DetailRow label="Value">{fmtBalance(tx.value, chain.decimals, chain.symbol)}</DetailRow>
                    <DetailRow label="Fee">{fmtBalance(fee, chain.decimals, chain.symbol)}</DetailRow>
                    <DetailRow label="Gas">
                        {fmtInt(tx.gasUsed)} used / {fmtInt(tx.gasLimit)} limit · {fmtInt(tx.gasPrice)} wei
                    </DetailRow>
                    <DetailRow label="Type">
                        {evmTxTypeLabel(tx.txType)} · nonce {tx.nonce}
                    </DetailRow>
                    <DetailRow label="Substrate view">
                        <ExtrinsicLink id={tx.extrinsic.id} hash={tx.extrinsic.hash} />
                    </DetailRow>
                    <DetailRow label="Input">
                        {tx.input === '0x' ? (
                            '0x'
                        ) : (
                            <details>
                                <summary className="cursor-pointer">
                                    {tx.inputSelector ?? '0x'} · {(tx.input.length - 2) / 2} bytes
                                </summary>
                                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-edge bg-bg px-3 py-2 text-xs break-all text-sub">{tx.input}</div>
                            </details>
                        )}
                    </DetailRow>
                </DetailCard>
            </div>

            <TabPanels at={tab} href={s => `/evm/tx/${hash}?tab=${s}`} panels={panels} />
        </div>
    )
}
