import FullText from '@/components/FullText'

// an address shows either full or as the fixed 7…4 split, nothing else
export function shortAddr(addr: string): string {
    if (addr.length <= 12) return addr
    return `${addr.slice(0, 7)}…${addr.slice(-4)}`
}

export default function AddressText({addr, full}: {addr: string; full?: boolean}) {
    return full ? <FullText text={addr} short={shortAddr(addr)} /> : shortAddr(addr)
}
