import Link from 'next/link'
import {notFound} from 'next/navigation'
import AccountLink from '@/components/AccountLink'
import HashText from '@/components/HashText'
import BytesToggle from '@/components/BytesToggle'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow} from '@/components/Detail'
import Pager from '@/components/Pager'
import {SplitRow, SplitRows} from '@/components/SplitRows'
import {TabNav, panelTabs, type Panel} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import TokenIcon from '@/components/TokenIcon'
import {BlockLink, EvmAddrLink, ExtrinsicLink} from '@/components/links'
import {PoisoningMark, poisoningRow} from '@/components/Poisoning'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {evmTxTypeLabel, exitDetail} from '@/lib/evm'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {evmTxDetail} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/tx/[hash]'>) {
    const {hash} = await props.params
    return {title: `EVM Tx ${shortHash(hash)}`}
}

export default async function EvmTxPage(props: PageProps<'/tx/[hash]'>) {
    const {hash} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    const pg = paging(sp)
    const [chain, data] = await Promise.all([chainProps(), evmTxDetail(hash.toLowerCase(), {limit: pg.size, offset: pg.offset})])
    const tx = data.evmTransactionById
    if (!tx) notFound()
    const ok = tx.status === 'Succeed'
    const detail = exitDetail(tx.exitReason)
    const fee = BigInt(tx.gasUsed) * BigInt(tx.gasPrice)

    const logs = (
        <>
            <Card size="flush" className="divide-y">
                {data.evmLogs.length === 0 && <div className="px-5 py-5 text-sm text-muted-foreground">None</div>}
                {data.evmLogs.map(log => (
                    <div key={log.id} className="space-y-1 px-5 py-3 font-mono text-xs">
                        <div>
                            <span className="text-muted-foreground">#{log.logIndex}</span> <EvmAddrLink addr={log.address} full />
                        </div>
                        {log.topics.map((t, i) => (
                            <div key={i} className="break-all text-muted-foreground">
                                <span className="text-dim">topic{i}</span> {t}
                            </div>
                        ))}
                        {log.data !== '0x' && <div className="break-all text-muted-foreground">data {log.data}</div>}
                    </div>
                ))}
            </Card>
            <Pager paging={pg} total={data.logCount.totalCount} href={`/tx/${hash}?tab=logs`} />
        </>
    )

    const transfers = (
        <SplitRows>
            {tx.extrinsic.transfers.map(t => (
                <SplitRow
                    key={t.id}
                    lead={
                        <>
                            <AccountLink addr={ss58Encode(t.from.id, chain.ss58)} acc={t.from} />
                            <span className="text-muted-foreground">→</span>
                            <AccountLink addr={ss58Encode(t.to.id, chain.ss58)} acc={t.to} />
                        </>
                    }
                >
                    <span className="font-mono">{fmtBalance(t.amount, chain.decimals, chain.symbol)}</span>
                </SplitRow>
            ))}
        </SplitRows>
    )

    const tokenTransfers = (
        <>
            <SplitRows>
                {data.tokenTransfers.map(t => (
                    <SplitRow
                        key={t.id}
                        className={poisoningRow(t)}
                        lead={
                            <>
                                <EvmAddrLink addr={t.from} />
                                <span className="text-muted-foreground">→</span>
                                <EvmAddrLink addr={t.to} />
                            </>
                        }
                    >
                        <PoisoningMark t={t}>
                            <span className="font-mono">{fmtBalance(t.amount, t.token.decimals ?? 0, t.token.symbol ?? undefined)}</span>
                        </PoisoningMark>
                        <Link href={`/token/${t.token.id}`} className="font-mono text-xs text-primary hover:underline">
                            <TokenIcon addr={t.token.id} />
                            <HashText hash={t.token.id} />
                        </Link>
                    </SplitRow>
                ))}
            </SplitRows>
            <Pager paging={pg} total={data.tokenTransferCount.totalCount} href={`/tx/${hash}?tab=transfers`} />
        </>
    )

    const panels: Panel[] = [{slug: 'logs', label: 'Logs', count: data.logCount.totalCount, body: () => logs}]
    if (data.tokenTransferCount.totalCount > 0) panels.unshift({slug: 'transfers', label: 'Token transfers', count: data.tokenTransferCount.totalCount, body: () => tokenTransfers})
    if (tx.extrinsic.transfers.length > 0) panels.unshift({slug: 'native', label: 'Native transfers', count: tx.extrinsic.transfers.length, body: () => transfers})

    const tabs = panelTabs(panels, tab, s => `/tx/${hash}?tab=${s}`)

    return (
        <div>
            <div className="mt-6 flex items-center gap-3">
                <h1 className="text-lg font-semibold">EVM Transaction</h1>
                <Badge variant={ok ? 'pos' : 'neg'}>{ok ? 'Success' : `${tx.status}${detail ? ` · ${detail}` : ''}`}</Badge>
            </div>

            <div className="mt-3">
                <DetailCard>
                    <DetailRow label="Hash">
                        {tx.id}
                        <CopyBtn text={tx.id} />
                    </DetailRow>
                    <DetailRow label="Block">
                        <BlockLink height={tx.block.height} /> <span className="text-muted-foreground">· index {tx.txIndex}</span>
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
                        {evmTxTypeLabel(tx.txType)} · nonce {fmtInt(tx.nonce)}
                    </DetailRow>
                    <DetailRow label="Substrate view">
                        <ExtrinsicLink id={tx.extrinsic.id} />
                    </DetailRow>
                    <DetailRow label="Input">{tx.input === '0x' ? '0x' : <BytesToggle hex={tx.input} lead={tx.inputSelector ?? '0x'} />}</DetailRow>
                </DetailCard>
            </div>

            <div className="mt-7">
                <TabNav aria-label="Transaction" items={tabs.items} />
                <div className="mt-4">{tabs.active.body()}</div>
            </div>
        </div>
    )
}
