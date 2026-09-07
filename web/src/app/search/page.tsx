import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Empty, EmptyDescription} from '@/components/ui/empty'
import {Item} from '@/components/ui/item'
import {chainProps} from '@/lib/chain'
import {isH160, isH256} from '@/lib/evm'
import AddressText from '@/components/AddressText'
import {isTokenAddress, searchLookups, searchNames} from '@/lib/gql'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

const ROW = 'gap-3 rounded-none border-0 px-5 py-3 [a]:hover:bg-background/60'

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
        redirect((await isTokenAddress(addr)) ? `/token/${addr}` : `/evm/address/${addr}`)
    }

    const chain = await chainProps()

    if (isH256(q)) {
        const hex = q.toLowerCase()
        const hit = await searchLookups(hex)
        if (hit.byHash[0]) redirect(`/block/${hit.byHash[0].height}`)
        if (hit.ext[0]) redirect(`/extrinsic/${hex}`)
        if (hit.evm[0]) redirect(`/evm/tx/${hit.evm[0].id}`)
        const asAccount = ss58Encode(hex, chain.ss58)
        redirect(`/account/${asAccount}`)
    }

    if (ss58TryDecode(q, chain.ss58)) redirect(`/account/${q}`)

    const {accounts, tokens} = await searchNames(q)
    if (accounts.length === 1 && tokens.length === 0) redirect(`/account/${ss58Encode(accounts[0].id, chain.ss58)}`)
    if (tokens.length === 1 && accounts.length === 0) redirect(`/token/${tokens[0].id}`)

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">
                Search <span className="font-normal text-muted-foreground">“{q}”</span>
            </h1>
            <Card size="flush" className="mt-3 divide-y">
                {accounts.length === 0 && tokens.length === 0 && (
                    <Empty className="px-5 py-8 text-wrap">
                        <EmptyDescription className="text-sm">Nothing found. Heights, extrinsics like 69254-1, hashes, ss58 or EVM addresses, identity names and token symbols are searchable.</EmptyDescription>
                    </Empty>
                )}
                {tokens.map(t => (
                    <Item key={t.id} asChild className={ROW}>
                        <Link href={`/token/${t.id}`}>
                            <Badge variant="idle">Token</Badge>
                            <span className="font-medium">{t.name ?? 'Unknown'}</span>
                            {t.symbol && <span className="text-xs text-muted-foreground">{t.symbol}</span>}
                            <span className="ml-auto font-mono text-xs text-muted-foreground">
                                <AddressText addr={t.id} />
                            </span>
                        </Link>
                    </Item>
                ))}
                {accounts.map(a => {
                    const addr = ss58Encode(a.id, chain.ss58)
                    return (
                        <Item key={a.id} asChild className={ROW}>
                            <Link href={`/account/${addr}`}>
                                <span className="font-medium">{a.identityDisplay}</span>
                                <span className="ml-auto font-mono text-xs text-muted-foreground">
                                    <AddressText addr={addr} />
                                </span>
                            </Link>
                        </Item>
                    )
                })}
            </Card>
        </div>
    )
}
