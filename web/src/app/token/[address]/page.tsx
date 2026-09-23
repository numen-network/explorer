import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import Pager from '@/components/Pager'
import {SplitRow, SplitRows} from '@/components/SplitRows'
import StatTile from '@/components/StatTile'
import {TabPanels} from '@/components/Tabs'
import {BlockLink, EvmTxLink} from '@/components/links'
import {TimeCell} from '@/components/TimeCell'
import TokenIcon from '@/components/TokenIcon'
import {Card} from '@/components/ui/card'
import {isH160} from '@/lib/evm'
import AddressText, {shortAddr} from '@/components/AddressText'
import {fmtBalance, fmtInt} from '@/lib/format'
import {tokenDetail} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {HoldersTable} from './tables'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/token/[address]'>) {
    const {address} = await props.params
    return {title: `Token ${shortAddr(address)}`}
}

export default async function TokenPage(props: PageProps<'/token/[address]'>) {
    const {address: raw} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    const pg = paging(sp)
    if (!isH160(raw)) notFound()
    const address = raw.toLowerCase()
    const data = await tokenDetail(address, {limit: pg.size, offset: pg.offset})
    const token = data.tokenById
    if (!token) notFound()
    const dec = token.decimals ?? 0
    const symbol = token.symbol ?? undefined

    const holders = (
        <>
            <Card size="flush">
                <HoldersTable rows={data.tokenHolders} offset={pg.offset} supply={token.totalSupply} decimals={dec} symbol={symbol} />
            </Card>
            <Pager paging={pg} total={token.holderCount} href={`/token/${address}?tab=holders`} />
        </>
    )

    const transfers = (
        <>
            <SplitRows>
                {data.tokenTransfers.length === 0 && <div className="px-5 py-5 text-sm text-muted-foreground">None</div>}
                {data.tokenTransfers.map(t => (
                    <SplitRow
                        key={t.id}
                        lead={
                            <>
                                <BlockLink height={t.block.height} />
                                <EvmTxLink hash={t.transaction.id} />
                                <span className="font-mono text-xs text-muted-foreground">
                                    <AddressText addr={t.from} /> → <AddressText addr={t.to} />
                                </span>
                            </>
                        }
                    >
                        <span className="font-mono">{fmtBalance(t.amount, dec, symbol)}</span>
                        <span className="shrink-0 text-right text-xs text-muted-foreground">
                            <TimeCell iso={t.timestamp} cycle />
                        </span>
                    </SplitRow>
                ))}
            </SplitRows>
            <Pager paging={pg} total={token.transferCount} href={`/token/${address}?tab=transfers`} />
        </>
    )

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">
                    <TokenIcon addr={token.id} />
                    {token.name ?? 'Token'} {token.symbol && <span className="text-sm font-normal text-muted-foreground">{token.symbol}</span>}
                </h1>
                <div className="mt-1 font-mono text-[13px] break-all text-muted-foreground">
                    <Link href={`/evm/address/${token.id}`} className="text-primary hover:underline">
                        {token.id}
                    </Link>
                    <CopyBtn text={token.id} />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Total supply" value={token.totalSupply != null ? fmtBalance(token.totalSupply, dec, symbol) : '—'} />
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
                    {slug: 'holders', label: 'Holders', count: token.holderCount, body: () => holders},
                    {slug: 'transfers', label: 'Transfers', count: token.transferCount, body: () => transfers},
                ]}
            />
        </div>
    )
}
