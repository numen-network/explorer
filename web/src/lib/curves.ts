// the three shapes pallet_referenda::Curve can take, Perbill and FixedI64 both
// count in billionths
export type Curve =
    | {__kind: 'LinearDecreasing'; length: number; floor: number; ceil: number}
    | {__kind: 'Reciprocal'; factor: string; xOffset: string; yOffset: string}
    | {__kind: 'SteppedDecreasing'; begin: number; end: number; step: number; period: number}

const BILLION = 1e9

const frac = (v: number | string) => Number(v) / BILLION

// x is the fraction of the decision period that has run
export function curveAt(c: Curve, x: number): number {
    const over = Math.min(1, Math.max(0, x))
    switch (c.__kind) {
        case 'Reciprocal':
            return Math.min(1, Math.max(0, frac(c.factor) / (over + frac(c.xOffset)) + frac(c.yOffset)))
        case 'LinearDecreasing': {
            const length = frac(c.length)
            const t = length > 0 ? Math.min(1, over / length) : 1
            return frac(c.ceil) - (frac(c.ceil) - frac(c.floor)) * t
        }
        case 'SteppedDecreasing':
            return Math.max(frac(c.end), frac(c.begin) - frac(c.step) * Math.floor(over / frac(c.period)))
    }
}

// span is whatever unit the chart plots the decision period in
export function curveSamples(c: Curve, span = 100, n = span + 1): [number, number][] {
    return Array.from({length: n}, (_, i) => {
        const t = i / (n - 1)
        return [t * span, curveAt(c, t) * 100] as [number, number]
    })
}
