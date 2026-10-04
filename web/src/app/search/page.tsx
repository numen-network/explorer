import Link from 'next/link'
import {redirect} from 'next/navigation'
import type {ReactNode} from 'react'
import {Card} from '@/components/ui/card'
import {Empty, EmptyDescription} from '@/components/ui/empty'
import {Item} from '@/components/ui/item'
import {chainProps} from '@/lib/chain'
import {isH160, isH256} from '@/lib/evm'
import AddressText from '@/components/AddressText'
import IdentityName from '@/components/IdentityName'
import Pager from '@/components/Pager'
import {TabPanels} from '@/components/Tabs'
import TokenIcon from '@/components/TokenIcon'
import {isTokenAddress, searchLookups, searchNames, type AccountRef} from '@/lib/gql'
import {identityLabel} from '@/lib/identity'
import {paging, type Paging} from '@/lib/paging'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

const ROW = 'gap-3 rounded-none border-0 px-5 py-3 [a]:hover:bg-background/60'

function AccountNames({a}: {a: AccountRef}) {
    return (
        <>
            <span className="flex min-w-0 items-center gap-1">
                <IdentityName acc={a} />
            </span>
            {a.username && a.username !== identityLabel(a) && <span className="text-xs text-muted-foreground">{a.username}</span>}
        </>
    )
}

function HitList({rows, total, pg, href}: {rows: ReactNode[]; total: number; pg: Paging; href: string}) {
    return (
        <>
            <Card size="flush">
                {rows.length === 0 && <div className="px-5 py-5 text-sm text-muted-foreground">None</div>}
                {rows}
            </Card>
            <Pager paging={pg} total={total} href={href} />
        </>
    )
}

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Search'}

export default async function SearchPage(props: PageProps<'/search'>) {
    const sp = await props.searchParams
    const q = typeof sp.q === 'string' ? sp.q.trim() : ''
    if (!q) {
        return (
            <Card size="flush" className="mt-6">
                <Empty className="px-6 py-10 text-wrap">
                    <EmptyDescription className="text-sm">Type a block height, extrinsic, hash, address or identity to search.</EmptyDescription>
                </Empty>
            </Card>
        )
    }

    if (/^\d+-\d+$/.test(q)) redirect(`/extrinsic/${q}`)
    if (/^\d+$/.test(q)) redirect(`/block/${q}`)
    if (isH160(q)) {
        const addr = q.toLowerCase()
        // a token contract has a page of its own, everything else is a plain evm address
        redirect((await isTokenAddress(addr)) ? `/token/${addr}` : `/address/${addr}`)
    }

    const chain = await chainProps()

    if (isH256(q)) {
        const hex = q.toLowerCase()
        const hit = await searchLookups(hex)
        if (hit.byHash[0]) redirect(`/block/${hit.byHash[0].height}`)
        if (hit.ext[0]) redirect(`/extrinsic/${hex}`)
        if (hit.evm[0]) redirect(`/tx/${hit.evm[0].id}`)
        const asAccount = ss58Encode(hex, chain.ss58)
        redirect(`/account/${asAccount}`)
    }

    if (ss58TryDecode(q, chain.ss58)) redirect(`/account/${q}`)

    const pg = paging(sp)
    const {accounts, accountCount, tokens, tokenCount} = await searchNames(q, {limit: pg.size, offset: pg.offset})
    const total = accountCount.totalCount + tokenCount.totalCount
    if (total === 1 && accounts.length === 1) redirect(`/account/${ss58Encode(accounts[0].id, chain.ss58)}`)
    if (total === 1 && tokens.length === 1) redirect(`/token/${tokens[0].id}`)

    const href = (tab: string) => `/search?${new URLSearchParams({q, tab})}`

    const accountRows = accounts.map(a => {
        const addr = ss58Encode(a.id, chain.ss58)
        return (
            <Item key={a.id} asChild className={ROW}>
                <Link href={`/account/${addr}`}>
                    <AccountNames a={a} />
                    <span className="ml-auto font-mono text-xs text-muted-foreground">
                        <AddressText addr={addr} />
                    </span>
                </Link>
            </Item>
        )
    })

    const tokenRows = tokens.map(t => (
        <Item key={t.id} asChild className={ROW}>
            <Link href={`/token/${t.id}`}>
                <span className="font-medium">
                    <TokenIcon addr={t.id} />
                    {t.name ?? 'Unknown'}
                </span>
                {t.symbol && <span className="text-xs text-muted-foreground">{t.symbol}</span>}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                    <AddressText addr={t.id} />
                </span>
            </Link>
        </Item>
    ))

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">
                Search <span className="font-normal text-muted-foreground">“{q}”</span>
            </h1>
            {total === 0 ? (
                <Card size="flush" className="mt-3">
                    <Empty className="px-5 py-8 text-wrap">
                        <EmptyDescription className="text-sm">Nothing found. Heights, extrinsics like 69254-1, hashes, ss58 or EVM addresses, identity names and token symbols are searchable.</EmptyDescription>
                    </Empty>
                </Card>
            ) : (
                <TabPanels
                    at={String(sp.tab ?? (accountCount.totalCount > 0 ? 'accounts' : 'tokens'))}
                    href={href}
                    className="mt-3"
                    panels={[
                        {slug: 'accounts', label: 'Accounts', count: accountCount.totalCount, body: () => <HitList rows={accountRows} total={accountCount.totalCount} pg={pg} href={href('accounts')} />},
                        {slug: 'tokens', label: 'Tokens', count: tokenCount.totalCount, body: () => <HitList rows={tokenRows} total={tokenCount.totalCount} pg={pg} href={href('tokens')} />},
                    ]}
                />
            )}
        </div>
    )
}
