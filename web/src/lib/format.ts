const GROUP = /\B(?=(\d{3})+(?!\d))/g

export function fmtInt(n: number | string | bigint): string {
    return String(n).replace(GROUP, ',')
}

export const sentenceCase = (s: string) => s[0].toUpperCase() + s.slice(1)

// snake_case status names read as a sentence
export const humanize = (s: string) => sentenceCase(s.replaceAll('_', ' '))

// a chain variant or event name reads as a sentence, BountyClaimed as Bounty claimed
export const camelLabel = (s: string) => sentenceCase(s.replace(/([a-z0-9])([A-Z])/g, '$1 $2').toLowerCase())

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

// a plain number counts as the shortest decimal that round-trips to it, so
// 1.15 is 115 at two decimals and not the 1.1499… its binary holds
function planckOf(x: number | string | bigint, decimals: number): [planck: bigint, decimals: number] {
    if (typeof x !== 'number') return [BigInt(x), decimals]
    const [mantissa, exp = '0'] = String(x).split('e')
    const [int, frac = ''] = mantissa.split('.')
    const scale = frac.length - Number(exp)
    return scale < 0 ? [BigInt(int + frac) * 10n ** BigInt(-scale), 0] : [BigInt(int + frac), scale]
}

// shortening never rounds up, the reader is never shown more than there is
export function truncFixed(x: number, digits: number): string
export function truncFixed(planck: string | bigint, digits: number, decimals: number): string
export function truncFixed(x: number | string | bigint, digits: number, decimals = 0): string {
    const {neg, v, base} = planckParts(...planckOf(x, decimals))
    const cut = ((v * 10n ** BigInt(digits)) / base).toString().padStart(digits + 1, '0')
    return signed(neg, digits ? `${cut.slice(0, -digits)}.${cut.slice(-digits)}` : cut)
}

const trimZeros = (fixed: string) => fixed.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1')

function trimNum(planck: bigint, decimals: number): string {
    const {whole} = planckParts(planck, decimals)
    return trimZeros(truncFixed(planck, whole >= 100n ? 0 : whole >= 10n ? 1 : 2, decimals))
}

// four digits still read as a number, so K only starts at ten thousand
const UNITS: [floor: bigint, shift: number, suffix: string][] = [
    [1_000_000_000n, 9, 'B'],
    [1_000_000n, 6, 'M'],
    [10_000n, 3, 'K'],
]

const unitFor = (whole: bigint): [bigint, number, string] => UNITS.find(([floor]) => whole >= floor) ?? [1n, 0, '']

export function fmtCompact(n: number): string
export function fmtCompact(planck: string | bigint, decimals: number): string
export function fmtCompact(x: number | string | bigint, decimals = 0): string {
    const [planck, scale] = planckOf(x, decimals)
    const [, shift, suffix] = unitFor(planckParts(planck, scale).whole)
    return trimNum(planck, scale + shift) + suffix
}

// ticks are whole multiples of the axis step, so every digit a tick has is one
// that sets it apart from its neighbours
export function fmtTick(v: number): string {
    const [planck, scale] = planckOf(v, 0)
    const [, shift, suffix] = unitFor(planckParts(planck, scale).whole)
    return trimZeros(truncFixed(planck, scale + shift, scale + shift)) + suffix
}

export function fmtCompact3(planck: string | bigint, decimals: number, symbol?: string): string {
    const {neg, v, whole} = planckParts(planck, decimals)
    const [, shift, suffix] = unitFor(whole)
    return signed(neg, fmtInt(truncFixed(v, 3, decimals + shift)) + suffix, symbol)
}

// one decimal in unit range, whole tokens below it, ≈ marks a lossy trim
export function fmtApprox(planck: string | bigint, decimals: number, symbol?: string): string {
    const {neg, v, whole} = planckParts(planck, decimals)
    const [, shift, suffix] = unitFor(whole)
    const digits = suffix === '' ? 0 : 1
    const exact = v % 10n ** BigInt(decimals + shift - digits) === 0n
    const out = fmtInt(truncFixed(v, digits, decimals + shift).replace(/\.0$/, '')) + suffix
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
