// the three shapes pallet_referenda::Curve can take
export type Curve =
    | {type: 'LinearDecreasing'; length: number; floor: number; ceil: number}
    | {type: 'Reciprocal'; factor: number; xOffset: number; yOffset: number}
    | {type: 'SteppedDecreasing'; begin: number; end: number; step: number; period: number}

// x is the fraction of the decision period that has run
export function curveAt(c: Curve, x: number): number {
    const over = Math.min(1, Math.max(0, x))
    switch (c.type) {
        case 'Reciprocal':
            return Math.min(1, Math.max(0, c.factor / (over + c.xOffset) + c.yOffset))
        case 'LinearDecreasing': {
            const t = c.length > 0 ? Math.min(1, over / c.length) : 1
            return c.ceil - (c.ceil - c.floor) * t
        }
        case 'SteppedDecreasing':
            return Math.max(c.end, c.begin - c.step * Math.floor(over / c.period))
    }
}

// span is whatever unit the chart plots the decision period in
export function curveSamples(c: Curve, span = 100, n = 101): [number, number][] {
    return Array.from({length: n}, (_, i) => {
        const t = i / (n - 1)
        return [t * span, curveAt(c, t) * 100] as [number, number]
    })
}
