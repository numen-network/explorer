import Link from 'next/link'
import {redirect} from 'next/navigation'
import {Tag} from '@/components/pills'
import {chainProps} from '@/lib/chain'
import {isH160, isH256} from '@/lib/evm'
import {shortHash} from '@/lib/format'
import {isTokenAddress, searchLookups, searchNames} from '@/lib/gql'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Search'}

export default async function SearchPage(props: PageProps<'/search'>) {
    const sp = await props.searchParams
    const q = typeof sp.q === 'string' ? sp.q.trim() : ''
    if (!q) {
        return <div className="card mt-6 px-6 py-10 text-center text-sm text-sub">Type a block height, extrinsic, hash, address or identity to search.</div>
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
                Search <span className="font-normal text-sub">“{q}”</span>
            </h1>
            <div className="card mt-3 divide-y divide-edge">
                {accounts.length === 0 && tokens.length === 0 && (
                    <div className="px-5 py-8 text-center text-sm text-sub">Nothing found. Heights, extrinsics like 69254-1, hashes, ss58 or EVM addresses, identity names and token symbols are searchable.</div>
                )}
                {tokens.map(t => (
                    <Link key={t.id} href={`/token/${t.id}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-bg/60">
                        <Tag text="Token" />
                        <span className="font-medium">{t.name ?? 'Unknown'}</span>
                        {t.symbol && <span className="text-xs text-sub">{t.symbol}</span>}
                        <span className="ml-auto font-mono text-xs text-sub">{shortHash(t.id, 8, 6)}</span>
                    </Link>
                ))}
                {accounts.map(a => {
                    const addr = ss58Encode(a.id, chain.ss58)
                    return (
                        <Link key={a.id} href={`/account/${addr}`} className="flex items-center gap-3 px-5 py-3 text-sm hover:bg-bg/60">
                            <span className="font-medium">{a.identityDisplay}</span>
                            <span className="ml-auto font-mono text-xs text-sub">{shortHash(addr, 8, 6)}</span>
                        </Link>
                    )
                })}
            </div>
        </div>
    )
}
