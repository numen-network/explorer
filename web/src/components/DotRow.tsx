import {Children, type ReactNode} from 'react'
import {cn} from 'cn'

// facts on a line split by middle dots, each dot wraps together with the fact
// after it so a line never ends on one, and keeps to the first line of a fact
// that wraps
export default function DotRow({className, children}: {className?: string; children: ReactNode}) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            {Children.toArray(children).map((child, i) =>
                i === 0 ? (
                    child
                ) : (
                    <span key={i} className="flex items-baseline gap-2">
                        <span className="text-dim">·</span>
                        {child}
                    </span>
                )
            )}
        </div>
    )
}
