// an address shows either full or as the fixed 7…4 split, nothing else
export function shortAddr(addr: string): string {
    if (addr.length <= 12) return addr
    return `${addr.slice(0, 7)}…${addr.slice(-4)}`
}

// full wraps at any character to fill its lines. a table cell breaks it only
// at the middle so the column can shrink to half an address, and on a phone
// shows 7…4 there, since even half of one crowds out the other columns
export default function AddressText({addr, full}: {addr: string; full?: boolean}) {
    if (!full) return shortAddr(addr)
    const half = Math.ceil(addr.length / 2)
    return (
        <>
            <span className="break-all whitespace-normal in-[td]:break-normal max-sm:in-[td]:hidden">
                {addr.slice(0, half)}
                <wbr />
                {addr.slice(half)}
            </span>
            <span className="hidden max-sm:in-[td]:inline">{shortAddr(addr)}</span>
        </>
    )
}
