import {shortHash} from '@/lib/format'

// an address shows either full or as the fixed 7…4 split, nothing else
export function shortAddr(addr: string): string {
    return shortHash(addr, 7, 4)
}

export default function AddressText({addr, full}: {addr: string; full?: boolean}) {
    return full ? addr : shortAddr(addr)
}
