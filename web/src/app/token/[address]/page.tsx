import {cn} from 'cn'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import Approx from '@/components/Approx'
import ContractPanel from '@/components/ContractPanel'
import CopyBtn from '@/components/CopyBtn'
import Pager from '@/components/Pager'
import {SplitRow, SplitRows} from '@/components/SplitRows'
import StatTile from '@/components/StatTile'
import {TabPanels} from '@/components/Tabs'
import {BlockLink, EvmAddrLink, EvmTxLink} from '@/components/links'
import {TimeCell} from '@/components/TimeCell'
import PairBadge from '@/components/PairBadge'
import TokenIcon from '@/components/TokenIcon'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {contractData} from '@/lib/contract'
import {isH160} from '@/lib/evm'
import AddressText, {shortAddr} from '@/components/AddressText'
import {fmtBalance, fmtInt} from '@/lib/format'
import {evmActivity, tokenDetail} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {HoldersTable} from './tables'

export const dynamic = 'force-dynamic'

// evm-proxy-detection's names for the kinds it tells apart, any other shows as stored
const PROXY_KIND: Record<string, string> = {
    Eip1167: 'EIP-1167',
    Eip1967Direct: 'EIP-1967',
    Eip1967Beacon: 'EIP-1967 beacon',
    Eip1822: 'EIP-1822',
    Eip2535Diamond: 'EIP-2535',
    Eip897: 'EIP-897',
}

// an EIP-1167 clone has its target baked into its code
const upgradeable = (kind: string) => (kind === 'Eip1167' ? 'fixed' : 'upgradeable')

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
    // every holder took part in a transfer, so the index tallied each one's activity
    const [{evmAddresses}, contract] = await Promise.all([evmActivity(data.tokenHolders.map(h => h.address)), tab === 'contract' ? contractData(address) : null])
    const activity = new Map(evmAddresses.map(a => [a.id, a]))
    const deploy = token.deployTx
    const kind = token.proxyType
    const impls = token.implementations ?? []
    // a fifth tile turns two rows of two into three over two
    const third = kind ? 'sm:col-span-2 lg:col-span-1' : undefined
    const half = kind ? 'sm:col-span-3 lg:col-span-1' : undefined

    const holders = (
        <>
            <Card size="flush">
                <HoldersTable rows={data.tokenHolders.map(h => ({...h, activity: activity.get(h.address)!}))} offset={pg.offset} supply={token.totalSupply} decimals={dec} symbol={symbol} />
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
                    <PairBadge token={token} className="ml-2" />
                    {kind && (
                        <Badge variant="idle" className="ml-2 font-normal">
                            Proxy
                        </Badge>
                    )}
                </h1>
                <div className="mt-1 font-mono text-[13px] break-all text-muted-foreground">
                    <Link href={`/address/${token.id}`} className="text-primary hover:underline">
                        {token.id}
                    </Link>
                    <CopyBtn text={token.id} />
                </div>
            </div>

            <div className={cn('mt-4 grid grid-cols-[minmax(0,1fr)] gap-4', kind ? 'sm:grid-cols-6 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-4')}>
                <StatTile className={third} label="Total supply" value={token.totalSupply != null ? <Approx planck={token.totalSupply} decimals={dec} symbol={symbol} breakable /> : '—'} />
                <StatTile className={third} label="Holders" value={fmtInt(token.holderCount)} />
                <StatTile className={third} label="Transfers" value={fmtInt(token.transferCount)} />
                <StatTile
                    className={half}
                    label={deploy ? 'Deployed at' : 'First seen'}
                    value={<BlockLink height={deploy?.block.height ?? token.firstBlock} />}
                    chips={
                        deploy
                            ? [
                                  {text: <EvmAddrLink addr={deploy.from} />, note: 'creator', tone: 'idle'},
                                  {text: <EvmTxLink hash={deploy.id} />, note: 'tx', tone: 'idle'},
                              ]
                            : undefined
                    }
                />
                {kind && (
                    <StatTile
                        className={half}
                        label="Implementation"
                        value={impls.length === 1 ? <EvmAddrLink addr={impls[0]} /> : `${fmtInt(impls.length)} facets`}
                        chips={[{text: PROXY_KIND[kind] ?? kind, note: upgradeable(kind), tone: 'idle'}]}
                    />
                )}
            </div>

            <TabPanels
                at={tab}
                href={s => `/token/${address}?tab=${s}`}
                panels={[
                    {slug: 'holders', label: 'Holders', count: token.holderCount, body: () => holders},
                    {slug: 'transfers', label: 'Transfers', count: token.transferCount, body: () => transfers},
                    {slug: 'contract', label: 'Contract', body: () => contract && <ContractPanel address={address} data={contract} />},
                ]}
            />
        </div>
    )
}
