import {Children, type ReactNode} from 'react'
import {cn} from 'cn'

// facts split by middle dots that never start or end a line, each dot keeps to
// the first line of a fact that wraps
export default function DotRow({className, align = 'start', children}: {className?: string; align?: 'start' | 'end'; children: ReactNode}) {
    const end = align === 'end'
    return (
        <div data-slot="dot-row" className={cn('flex flex-wrap items-center gap-x-6 gap-y-2 overflow-x-clip', end ? '-mr-0.5 justify-end pr-0.5' : '-ml-0.5 pl-0.5', className)}>
            {Children.toArray(children).map((child, i) => (
                <span key={i} className={cn('flex items-baseline gap-2', end ? '-mr-4 flex-row-reverse' : '-ml-4')}>
                    <span className="w-2 shrink-0 text-center text-dim">·</span>
                    {child}
                </span>
            ))}
        </div>
    )
}
