// the three shapes pallet_referenda::Curve can take, Perbill and FixedI64 both
// count in billionths
export type Curve =
    | {__kind: 'LinearDecreasing'; length: number; floor: number; ceil: number}
    | {__kind: 'Reciprocal'; factor: string; xOffset: string; yOffset: string}
    | {__kind: 'SteppedDecreasing'; begin: number; end: number; step: number; period: number}

export const ONE = 1_000_000_000n

const clamp = (p: bigint) => (p < 0n ? 0n : p > ONE ? ONE : p)
const min = (a: bigint, b: bigint) => (a < b ? a : b)
const divCeil = (a: bigint, b: bigint) => (a + b - 1n) / b

// FixedI64 checked_rounding_div, rounded toward +inf when up and -inf otherwise
function fixedDiv(a: bigint, b: bigint, up: boolean): bigint {
    const n = a * ONE
    const q = n / b
    if (n % b === 0n) return q
    const negative = n < 0n !== b < 0n
    if (up) return negative ? q : q + 1n
    return negative ? q - 1n : q
}

/** Perbill::from_rational, rounded down and one for a zero denominator. */
export const perbill = (part: bigint, whole: bigint) => (whole === 0n ? ONE : min((part * ONE) / whole, ONE))

/** Curve::threshold, what y the curve demands at x, both in billionths. */
export function threshold(c: Curve, x: bigint): bigint {
    switch (c.__kind) {
        case 'LinearDecreasing': {
            const length = BigInt(c.length)
            const ceil = BigInt(c.ceil)
            return ceil - (perbill(min(x, length), length) * (ceil - BigInt(c.floor))) / ONE
        }
        case 'SteppedDecreasing': {
            const begin = BigInt(c.begin)
            const y = begin - min(clamp(BigInt(c.step) * (x / BigInt(c.period))), begin)
            const end = BigInt(c.end)
            return y > end ? y : end
        }
        case 'Reciprocal':
            return clamp(fixedDiv(BigInt(c.factor), x + BigInt(c.xOffset), false) + BigInt(c.yOffset))
    }
}

/** Curve::delay, how far into the decision period the curve falls to y, one when it never does. */
export function delay(c: Curve, y: bigint): bigint {
    switch (c.__kind) {
        case 'LinearDecreasing': {
            const floor = BigInt(c.floor)
            const ceil = BigInt(c.ceil)
            if (y < floor) return ONE
            if (y > ceil) return 0n
            if (ceil === floor) return ONE
            return (min(divCeil((ceil - y) * ONE, ceil - floor), ONE) * BigInt(c.length)) / ONE
        }
        case 'SteppedDecreasing': {
            if (y < BigInt(c.end)) return ONE
            const begin = BigInt(c.begin)
            const step = BigInt(c.step)
            return clamp(BigInt(c.period) * (clamp(begin - min(y, begin) + step - 1n) / step))
        }
        case 'Reciprocal': {
            const over = y - BigInt(c.yOffset)
            if (over === 0n) return ONE
            const x = fixedDiv(BigInt(c.factor), over, true) - BigInt(c.xOffset)
            return x < 0n || x > ONE ? ONE : x
        }
    }
}

// x is the fraction of the decision period that has run
export function curveAt(c: Curve, x: number): number {
    const over = Math.min(1, Math.max(0, x))
    return Number(threshold(c, BigInt(Math.floor(over * 1e9)))) / 1e9
}

// span is whatever unit the chart plots the decision period in
export function curveSamples(c: Curve, span = 100, n = span + 1): [number, number][] {
    return Array.from({length: n}, (_, i) => {
        const t = i / (n - 1)
        return [t * span, curveAt(c, t) * 100] as [number, number]
    })
}
