import Link from 'next/link'
import {ArrowUpRight} from 'lucide-react'
import {AddrMark} from '@/components/addrHot'
import {BlockStatus} from '@/components/blockStatus'
import HashText from '@/components/HashText'
import {Tip} from '@/components/Tip'
import {extrinsicPath, fmtInt} from '@/lib/format'

// marks a link that leaves for somewhere else, sized to whatever text it sits in
export function Jump() {
    return <ArrowUpRight aria-hidden className="inline size-[0.95em] align-[-0.09em]" />
}

export function BlockLink({height}: {height: number}) {
    return (
        <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <Link href={`/block/${height}`} className="font-mono text-primary hover:underline">
                #{fmtInt(height)}
            </Link>
            <BlockStatus height={height} />
        </span>
    )
}

// a number with its title, or the bare number when the index has none
function NumberedLink({href, index, title}: {href: string; index: number; title?: string | null}) {
    return (
        <Link href={href} className="text-primary hover:underline">
            <span className="font-mono">#{fmtInt(index)}</span>
            {title && <span className="text-foreground"> · {title}</span>}
        </Link>
    )
}

export function ReferendumLink({index, title}: {index: number; title?: string | null}) {
    return <NumberedLink href={`/referendum/${index}`} index={index} title={title} />
}

export function BountyLink({index, title}: {index: number; title?: string | null}) {
    return <NumberedLink href={`/bounty/${index}`} index={index} title={title} />
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
        <Tip text={full ? undefined : addr}>
            <AddrMark asChild addr={addr}>
                <Link href={`/address/${addr}`} className="font-mono text-primary hover:underline">
                    <HashText hash={addr} full={full} />
                </Link>
            </AddrMark>
        </Tip>
    )
}

export function EvmTxLink({hash, full = false}: {hash: string; full?: boolean}) {
    return (
        <Tip text={full ? undefined : hash}>
            <Link href={`/tx/${hash}`} className="font-mono text-primary hover:underline">
                <HashText hash={hash} full={full} />
            </Link>
        </Tip>
    )
}
