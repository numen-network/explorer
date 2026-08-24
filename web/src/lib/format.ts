const GROUP = /\B(?=(\d{3})+(?!\d))/g

export function fmtInt(n: number | string | bigint): string {
    return String(n).replace(GROUP, ',')
}

// every planck the chain holds, trailing zeros trimmed. a balance is never
// rounded for looks, the reader is owed the whole number
export function fmtBalance(planck: string | bigint, decimals: number, symbol?: string): string {
    let v = BigInt(planck)
    const neg = v < 0n
    if (neg) v = -v
    const base = 10n ** BigInt(decimals)
    let out = fmtInt(v / base)
    const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '')
    if (frac) out += '.' + frac
    if (neg) out = '-' + out
    return symbol ? `${out} ${symbol}` : out
}

export function planckToNum(planck: string | bigint, decimals: number): number {
    const shift = Math.max(0, decimals - 6)
    return Number(BigInt(planck) / 10n ** BigInt(shift)) / 10 ** (decimals - shift)
}

function trimNum(x: number): string {
    const fixed = Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

export function fmtCompact(n: number): string {
    const abs = Math.abs(n)
    if (abs >= 1e9) return trimNum(n / 1e9) + 'B'
    if (abs >= 1e6) return trimNum(n / 1e6) + 'M'
    if (abs >= 1e4) return trimNum(n / 1e3) + 'K'
    return trimNum(n)
}

export function shortHash(s: string, pre = 5, post = 4): string {
    if (s.length <= pre + post + 1) return s
    return `${s.slice(0, pre)}…${s.slice(-post)}`
}

export function pct(x: number, digits = 2): string {
    return `${(x * 100).toFixed(digits)}%`
}

const pad2 = (n: number) => String(n).padStart(2, '0')

export function fmtDateTime(iso: string, utc: boolean): string {
    const d = new Date(iso)
    return utc
        ? `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())} ${pad2(d.getUTCHours())}:${pad2(d.getUTCMinutes())}:${pad2(d.getUTCSeconds())}`
        : `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`
}

// governance periods are counted in blocks, the chain reports its target pace
export function fmtBlockSpan(blocks: number, blockTime: number): string {
    const secs = Math.max(0, blocks * blockTime)
    if (secs >= 86400) return `${Math.round(secs / 86400)}d`
    if (secs >= 3600) return `${Math.round(secs / 3600)}h`
    if (secs >= 60) return `${Math.round(secs / 60)}m`
    return `${secs}s`
}

// squid mints 0000069254-4a12b-000001, the url wants height and index
export function extrinsicPath(squidId: string): string {
    const p = squidId.split('-')
    if (p.length !== 3) return squidId
    const height = Number(p[0])
    const index = Number(p[2])
    return Number.isInteger(height) && Number.isInteger(index) ? `${height}-${index}` : squidId
}

export function fmtAge(iso: string): string {
    const mins = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 60000))
    const hrs = Math.floor(mins / 60)
    const days = Math.floor(hrs / 24)
    const years = Math.floor(days / 365)
    const unit = (n: number, u: string) => `${fmtInt(n)} ${u}${n === 1 ? '' : 's'}`
    if (years > 0) return `${unit(years, 'yr')} ${unit(days - years * 365, 'day')}`
    if (days > 0) return `${unit(days, 'day')} ${unit(hrs - days * 24, 'hr')}`
    if (hrs > 0) return `${unit(hrs, 'hr')} ${unit(mins - hrs * 60, 'min')}`
    return unit(mins, 'min')
}
