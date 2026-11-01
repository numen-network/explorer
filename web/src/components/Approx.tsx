import {Fragment} from 'react'
import {approxParts} from '@/lib/format'

// the served Inter has no ≈, so Arial draws it, 2px ahead of the figure.
// its line height is cut to the glyph, so Arial's metrics can't stretch the line.
// breakable lets a long figure wrap between its digit groups
export default function Approx({planck, decimals, symbol, move, breakable}: {planck: string | bigint; decimals: number; symbol?: string; move?: boolean; breakable?: boolean}) {
    const {exact, figure} = approxParts(planck, decimals, symbol, move)
    return (
        <>
            {!exact && <span className="mr-0.5 font-[Arial,sans-serif] leading-none">≈</span>}
            {breakable ? figure.split(',').map((part, i) => (i ? <Fragment key={i}>,<wbr />{part}</Fragment> : part)) : figure}
        </>
    )
}
