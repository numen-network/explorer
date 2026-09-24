import Link from 'next/link'
import {ArrowUpRight} from 'lucide-react'
import {AddrMark} from '@/components/addrHot'
import AddressText from '@/components/AddressText'
import {Tip} from '@/components/Tip'
import {extrinsicPath, fmtInt, shortHash} from '@/lib/format'

// marks a link that leaves for somewhere else, sized to whatever text it sits in
export function Jump() {
    return <ArrowUpRight aria-hidden className="inline size-[0.95em] align-[-0.09em]" />
}

export function BlockLink({height}: {height: number}) {
    return (
        <Link href={`/block/${height}`} className="font-mono text-primary hover:underline">
            #{fmtInt(height)}
        </Link>
    )
}

// the hash still resolves, but our own links never leave it ambiguous
export function ExtrinsicLink({id}: {id: string}) {
    const path = extrinsicPath(id)
    return (
        <Link href={`/extrinsic/${path}`} className="font-mono text-primary hover:underline">
            {path}
        </Link>
    )
}

export function EventLink({height, index}: {height: number; index: number}) {
    return (
        <Link href={`/event/${height}-${index}`} className="font-mono text-primary hover:underline">
            {height}-{index}
        </Link>
    )
}

export function EvmAddrLink({addr, full = false}: {addr: string; full?: boolean}) {
    return (
        <AddrMark addr={addr}>
            <Tip text={full ? undefined : addr}>
                <Link href={`/address/${addr}`} className="font-mono text-primary hover:underline">
                    <AddressText addr={addr} full={full} />
                </Link>
            </Tip>
        </AddrMark>
    )
}

export function EvmTxLink({hash, full = false}: {hash: string; full?: boolean}) {
    return (
        <Tip text={full ? undefined : hash}>
            <Link href={`/tx/${hash}`} className="font-mono text-primary hover:underline">
                {full ? hash : shortHash(hash, 10, 6)}
            </Link>
        </Tip>
    )
}
