import type {ReactNode} from 'react'
import {cn} from 'cn'

/** One line per part of a row, the same height in every column so the parts line up across it. */
export function Lines({items, end}: {items: ReactNode[]; end?: boolean}) {
    return (
        <div className={cn('flex flex-col', end ? 'items-end' : 'items-start')}>
            {items.map((item, i) => (
                <div key={i} className="flex h-6 items-center">
                    {item}
                </div>
            ))}
        </div>
    )
}
