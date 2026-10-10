import {Fragment} from 'react'
import {approxParts} from '@/lib/format'

// the served Inter has no ≈, so the system sans draws it 2px ahead of the
// figure, its line height cut to the glyph so that font's metrics never
// stretch the line. breakable lets a figure too long for its box wrap
// between its digit groups
export default function Approx({planck, decimals, symbol, move, breakable}: {planck: string | bigint; decimals: number; symbol?: string; move?: boolean; breakable?: boolean}) {
    const {exact, figure} = approxParts(planck, decimals, symbol, move)
    return (
        <>
            {!exact && <span className="mr-0.5 font-[sans-serif] leading-none">≈</span>}
            {breakable ? figure.split(',').map((part, i) => (i ? <Fragment key={i}>,<wbr />{part}</Fragment> : part)) : figure}
        </>
    )
}
