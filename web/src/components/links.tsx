import Link from 'next/link'
import {AddrMark} from '@/components/addrHot'
import {extrinsicPath, fmtInt, shortHash} from '@/lib/format'

// marks a link that leaves for somewhere else, sized to whatever text it sits
// in. geometry is lucide arrow-up-right under ISC, inlined rather than imported
// because their react package turns every icon into a client boundary
export function Jump() {
    return (
        <svg width="0.95em" height="0.95em" viewBox="0 0 24 24" fill="none" aria-hidden className="inline-block align-[-0.09em]">
            <g stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 7h10v10" />
                <path d="M7 17 17 7" />
            </g>
        </svg>
    )
}

export function BlockLink({height}: {height: number}) {
    return (
        <Link href={`/block/${height}`} className="font-mono text-accent hover:underline">
            #{fmtInt(height)}
        </Link>
    )
}

// the hash still resolves, but our own links never leave it ambiguous
export function ExtrinsicLink({id, hash}: {id: string; hash: string}) {
    const path = extrinsicPath(id)
    return (
        <Link href={`/extrinsic/${path}`} className="font-mono text-accent hover:underline" title={hash}>
            {path}
        </Link>
    )
}

export function EvmAddrLink({addr, full = false}: {addr: string; full?: boolean}) {
    return (
        <AddrMark addr={addr}>
            <Link href={`/evm/address/${addr}`} className="font-mono text-accent hover:underline" title={addr}>
                {full ? addr : shortHash(addr, 8, 6)}
            </Link>
        </AddrMark>
    )
}

export function EvmTxLink({hash, full = false}: {hash: string; full?: boolean}) {
    return (
        <Link href={`/evm/tx/${hash}`} className="font-mono text-accent hover:underline" title={hash}>
            {full ? hash : shortHash(hash, 10, 6)}
        </Link>
    )
}
