import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import HoldingsList from '@/components/HoldingsList'
import {AddrMark} from '@/components/addrHot'
import {TabPanels, type Panel} from '@/components/Tabs'
import TokenIcon from '@/components/TokenIcon'
import {Jump} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {evmMappedAccount, isH160} from '@/lib/evm'
import {shortAddr} from '@/components/AddressText'
import {evmAddressData} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {EvmTxsTable} from './tables'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/evm/address/[address]'>) {
    const {address} = await props.params
    return {title: `EVM ${shortAddr(address)}`}
}

export default async function EvmAddressPage(props: PageProps<'/evm/address/[address]'>) {
    const {address: raw} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    if (!isH160(raw)) notFound()
    const address = raw.toLowerCase()
    const [chain, data] = await Promise.all([chainProps(), evmAddressData(address)])
    const mapped = ss58Encode(evmMappedAccount(address), chain.ss58)
    const isContract = data.created.length > 0 || data.asToken !== null

    const txs = (
        <Card size="flush">
            <EvmTxsTable rows={data.txs} addr={address} chain={chain} />
        </Card>
    )

    const panels: Panel[] = [{slug: 'txs', label: 'Transactions', count: data.txs.length, body: () => txs}]
    if (data.holdings.length > 0) panels.push({slug: 'holdings', label: 'Tokens', count: data.holdings.length, body: () => <HoldingsList rows={data.holdings} />})

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
                </div>
                <div className="mt-1 font-mono text-[13px] break-all text-muted-foreground">
                    <AddrMark addr={address}>{address}</AddrMark>
                    <CopyBtn text={address} />
                </div>
                <div className="mt-1 text-[13px] text-muted-foreground">
                    Mapped substrate account{' '}
                    <Link href={`/account/${mapped}`} className="font-mono break-all text-primary hover:underline">
                        {mapped}
                    </Link>
                    <span className="ml-2 text-xs text-dim">one way, balances live there</span>
                </div>
            </div>

            <TabPanels at={tab} href={s => `/evm/address/${address}?tab=${s}`} panels={panels} />
        </div>
    )
}
