'use client'

import {useEffect, useRef, useState, type ReactNode} from 'react'
import {cn} from 'cn'
import {Button} from '@/components/ui/button'

const FOLD_ABOVE = 2000

/** Cuts content taller than 2000px down to 640px behind a fade, with Show More to open it. */
export default function Foldable({children}: {children: ReactNode}) {
    const inner = useRef<HTMLDivElement>(null)
    // starts folded so long text never flashes open before it is measured
    const [long, setLong] = useState(true)
    const [open, setOpen] = useState(false)

    useEffect(() => {
        const el = inner.current!
        const ro = new ResizeObserver(() => setLong(el.scrollHeight > FOLD_ABOVE))
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    const folded = long && !open
    return (
        <div className={cn('relative', folded && 'max-h-160 overflow-hidden')}>
            <div ref={inner}>{children}</div>
            {long && (
                <div className={cn('flex justify-center', folded ? 'absolute inset-x-0 bottom-0 bg-linear-to-b from-transparent via-card/80 to-card pt-12 pb-4' : 'mt-4')}>
                    <Button variant="outline" size="sm" aria-expanded={open} onClick={() => setOpen(!open)}>
                        Show {open ? 'Less' : 'More'}
                    </Button>
                </div>
            )}
        </div>
    )
}
