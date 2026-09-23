import Link from 'next/link'
import {notFound} from 'next/navigation'
import {ChevronRight} from 'lucide-react'
import AccountLink from '@/components/AccountLink'
import AddressText from '@/components/AddressText'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow} from '@/components/Detail'
import {SplitRow, SplitRows} from '@/components/SplitRows'
import {TabPanels, type Panel} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import TokenIcon from '@/components/TokenIcon'
import {BlockLink, EvmAddrLink, ExtrinsicLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {chainProps} from '@/lib/chain'
import {evmTxTypeLabel, exitDetail} from '@/lib/evm'
import {fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {evmTxDetail} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/tx/[hash]'>) {
    const {hash} = await props.params
    return {title: `EVM Tx ${shortHash(hash, 10, 6)}`}
}

export default async function EvmTxPage(props: PageProps<'/tx/[hash]'>) {
    const {hash} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    const [chain, data] = await Promise.all([chainProps(), evmTxDetail(hash.toLowerCase())])
    const tx = data.evmTransactionById
    if (!tx) notFound()
    const ok = tx.status === 'Succeed'
    const detail = exitDetail(tx.exitReason)
    const fee = BigInt(tx.gasUsed) * BigInt(tx.gasPrice)

    const logs = (
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
        <SplitRows>
            {data.tokenTransfers.map(t => (
                <SplitRow
                    key={t.id}
                    lead={
                        <>
                            <EvmAddrLink addr={t.from} />
                            <span className="text-muted-foreground">→</span>
                            <EvmAddrLink addr={t.to} />
                        </>
                    }
                >
                    <span className="font-mono">{fmtBalance(t.amount, t.token.decimals ?? 0, t.token.symbol ?? undefined)}</span>
                    <Link href={`/token/${t.token.id}`} className="font-mono text-xs text-primary hover:underline">
                        <TokenIcon addr={t.token.id} />
                        <AddressText addr={t.token.id} />
                    </Link>
                </SplitRow>
            ))}
        </SplitRows>
    )

    const panels: Panel[] = [{slug: 'logs', label: 'Logs', count: data.evmLogs.length, body: () => logs}]
    if (data.tokenTransfers.length > 0) panels.unshift({slug: 'transfers', label: 'Token transfers', count: data.tokenTransfers.length, body: () => tokenTransfers})
    if (tx.extrinsic.transfers.length > 0) panels.unshift({slug: 'native', label: 'Native transfers', count: tx.extrinsic.transfers.length, body: () => transfers})

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
                        {evmTxTypeLabel(tx.txType)} · nonce {tx.nonce}
                    </DetailRow>
                    <DetailRow label="Substrate view">
                        <ExtrinsicLink id={tx.extrinsic.id} hash={tx.extrinsic.hash} />
                    </DetailRow>
                    <DetailRow label="Input">
                        {tx.input === '0x' ? (
                            '0x'
                        ) : (
                            <Collapsible className="group">
                                <CollapsibleTrigger className="flex cursor-pointer items-center gap-1.5">
                                    <ChevronRight className="size-3.5 text-dim transition-transform group-data-[state=open]:rotate-90" />
                                    {tx.inputSelector ?? '0x'} · {(tx.input.length - 2) / 2} bytes
                                </CollapsibleTrigger>
                                <CollapsibleContent className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-background px-3 py-2 text-xs break-all text-muted-foreground">{tx.input}</CollapsibleContent>
                            </Collapsible>
                        )}
                    </DetailRow>
                </DetailCard>
            </div>

            <TabPanels at={tab} href={s => `/tx/${hash}?tab=${s}`} panels={panels} />
        </div>
    )
}
