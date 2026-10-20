import Link from 'next/link'
import {notFound} from 'next/navigation'
import ContractPanel from '@/components/ContractPanel'
import CopyBtn from '@/components/CopyBtn'
import HoldingsTable from '@/components/HoldingsTable'
import Pager from '@/components/Pager'
import {AddrMark} from '@/components/addrHot'
import {TabPanels, type Panel} from '@/components/Tabs'
import PairBadge from '@/components/PairBadge'
import TokenIcon from '@/components/TokenIcon'
import {Jump} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {contractData} from '@/lib/contract'
import {evmMappedAccount, isH160} from '@/lib/evm'
import {evmAddressData} from '@/lib/gql'
import {shortHash} from '@/lib/format'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {EvmTxsTable} from './tables'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/address/[address]'>) {
    const {address} = await props.params
    return {title: `EVM ${shortHash(address)}`}
}

export default async function EvmAddressPage(props: PageProps<'/address/[address]'>) {
    const {address: raw} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    if (!isH160(raw)) notFound()
    const address = raw.toLowerCase()
    const pg = paging(sp)
    const [chain, data] = await Promise.all([chainProps(), evmAddressData(address, {limit: pg.size, offset: pg.offset})])
    const mapped = ss58Encode(evmMappedAccount(address), chain.ss58)
    const isContract = data.created.length > 0 || data.asToken !== null
    const contract = isContract && tab === 'contract' ? await contractData(address) : null

    const txs = (
        <>
            <Card size="flush">
                <EvmTxsTable rows={data.txs} addr={address} chain={chain} />
            </Card>
            <Pager paging={pg} total={data.txCount.totalCount} href={`/address/${address}?tab=txs`} />
        </>
    )

    const holdings = (
        <>
            <Card size="flush">
                <HoldingsTable rows={data.holdings} />
            </Card>
            <Pager paging={pg} total={data.holdingCount.totalCount} href={`/address/${address}?tab=holdings`} />
        </>
    )

    const panels: Panel[] = [{slug: 'txs', label: 'Transactions', count: data.txCount.totalCount, body: () => txs}]
    if (data.holdingCount.totalCount > 0) panels.push({slug: 'holdings', label: 'Tokens', count: data.holdingCount.totalCount, body: () => holdings})
    if (isContract) panels.push({slug: 'contract', label: 'Contract', body: () => contract && <ContractPanel address={address} data={contract} />})

    return (
        <div>
            <div className="mt-6">
                <div className="flex items-center gap-2.5">
                    <h1 className="text-lg font-semibold">EVM address</h1>
                    {isContract && <Badge variant="primary">Contract</Badge>}
                    {data.asToken && (
                        <Link href={`/token/${address}`} className="text-sm text-primary hover:underline">
                            <TokenIcon addr={address} />
                            {data.asToken.name ?? 'Token'} {data.asToken.symbol ? `(${data.asToken.symbol})` : ''} <Jump />
                        </Link>
                    )}
                    {data.asToken && <PairBadge token={data.asToken} />}
                </div>
                <div className="mt-1 font-mono text-[13px] break-all text-muted-foreground">
                    <AddrMark addr={address}>{address}</AddrMark>
                    <CopyBtn text={address} />
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                    <span className="mr-2">Mapped substrate account</span>
                    <AddrMark asChild addr={mapped}>
                        <Link href={`/account/${mapped}`} className="font-mono break-all text-primary hover:underline">
                            {mapped}
                        </Link>
                    </AddrMark>
                    <span className="ml-2 text-xs text-dim">one way, balances live there</span>
                </div>
            </div>

            <TabPanels at={tab} href={s => `/address/${address}?tab=${s}`} panels={panels} />
        </div>
    )
}
