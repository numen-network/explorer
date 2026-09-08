const GROUP = /\B(?=(\d{3})+(?!\d))/g

export function fmtInt(n: number | string | bigint): string {
    return String(n).replace(GROUP, ',')
}

export const sentenceCase = (s: string) => s[0].toUpperCase() + s.slice(1)

// snake_case status names read as a sentence
export const humanize = (s: string) => sentenceCase(s.replaceAll('_', ' '))

// track names are snake_case and read as a title
export const trackLabel = (name: string) => name.split('_').map(sentenceCase).join(' ')

function planckParts(planck: string | bigint, decimals: number): {neg: boolean; v: bigint; base: bigint; whole: bigint} {
    let v = BigInt(planck)
    const neg = v < 0n
    if (neg) v = -v
    const base = 10n ** BigInt(decimals)
    return {neg, v, base, whole: v / base}
}

const signed = (neg: boolean, out: string, symbol?: string) => `${neg ? '-' : ''}${out}${symbol ? ` ${symbol}` : ''}`

// every planck the chain holds, trailing zeros trimmed. a balance is never
// rounded for looks, the reader is owed the whole number
export function fmtBalance(planck: string | bigint, decimals: number, symbol?: string): string {
    const {neg, v, base, whole} = planckParts(planck, decimals)
    const frac = (v % base).toString().padStart(decimals, '0').replace(/0+$/, '')
    return signed(neg, fmtInt(whole) + (frac ? '.' + frac : ''), symbol)
}

export function planckToNum(planck: string | bigint, decimals: number): number {
    const shift = Math.max(0, decimals - 6)
    return Number(BigInt(planck) / 10n ** BigInt(shift)) / 10 ** (decimals - shift)
}

function trimNum(x: number): string {
    const fixed = Math.abs(x) >= 100 ? x.toFixed(0) : Math.abs(x) >= 10 ? x.toFixed(1) : x.toFixed(2)
    return fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')
}

// four digits still read as a number, so K only starts at ten thousand
const UNITS: [floor: bigint, div: bigint, suffix: string][] = [
    [1_000_000_000n, 1_000_000_000n, 'B'],
    [1_000_000n, 1_000_000n, 'M'],
    [10_000n, 1_000n, 'K'],
]

const unitFor = (whole: bigint): [bigint, bigint, string] => UNITS.find(([floor]) => whole >= floor) ?? [1n, 1n, '']

export function fmtCompact(n: number): string {
    const [, div, suffix] = unitFor(BigInt(Math.floor(Math.abs(n))))
    return trimNum(n / Number(div)) + suffix
}

export function fmtCompact3(planck: string | bigint, decimals: number, symbol?: string): string {
    const {neg, v, base, whole} = planckParts(planck, decimals)
    const [, div, suffix] = unitFor(whole)
    const scaled = (v * 1000n) / (base * div)
    return signed(neg, `${fmtInt(scaled / 1000n)}.${(scaled % 1000n).toString().padStart(3, '0')}${suffix}`, symbol)
}

// one decimal in unit range, whole tokens below it, ≈ marks a lossy trim
export function fmtApprox(planck: string | bigint, decimals: number, symbol?: string): string {
    const {neg, v, base, whole} = planckParts(planck, decimals)
    const [, div, suffix] = unitFor(whole)
    let out: string
    let exact: boolean
    if (suffix === '') {
        out = fmtInt(whole)
        exact = whole * base === v
    } else {
        const tenths = (v * 10n) / (base * div)
        out = `${fmtInt(tenths / 10n)}${tenths % 10n === 0n ? '' : '.' + (tenths % 10n)}${suffix}`
        exact = tenths * base * div === v * 10n
    }
    return `${exact ? '' : '≈'}${signed(neg, out, symbol)}`
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

const MONTH_DAYS = 30
const YEAR_DAYS = 365

/**
 * A wait in calendar units, since a payout months away reads as nothing in days.
 * A month is 30 days and a year 365, which is what anybody reading a schedule
 * takes them for.
 */
export function fmtDaySpan(blocks: number, blockTime: number): string {
    const days = Math.max(1, Math.ceil((blocks * blockTime) / 86400))
    if (days >= YEAR_DAYS) {
        const years = Math.floor(days / YEAR_DAYS)
        const months = Math.floor((days % YEAR_DAYS) / MONTH_DAYS)
        return months > 0 ? `${years}y ${months}mo` : `${years}y`
    }
    if (days >= MONTH_DAYS) {
        const months = Math.floor(days / MONTH_DAYS)
        const rest = days % MONTH_DAYS
        return rest > 0 ? `${months}mo ${rest}d` : `${months}mo`
    }
    return `${days}d`
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
