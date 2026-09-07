'use client'
import {useEffect, useRef, useState, type ReactNode} from 'react'
import {ChevronLeft, ChevronRight} from 'lucide-react'
import {Button} from '@/components/ui/button'

export default function TabScroller({children}: {children: ReactNode}) {
    const ref = useRef<HTMLDivElement>(null)
    const [state, setState] = useState({left: false, right: false})
    const sync = () => {
        const el = ref.current
        if (!el) return
        setState({
            left: el.scrollLeft > 1,
            right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1,
        })
    }
    useEffect(() => {
        sync()
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(sync)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])
    const nudge = (dir: 1 | -1) => {
        const el = ref.current
        el?.scrollBy({left: dir * el.clientWidth * 0.6, behavior: 'smooth'})
    }
    // pb-3 mirrors the links' bottom band so the icon centers on the label line
    return (
        <div className="relative -mb-px w-full">
            {state.left && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll left" onClick={() => nudge(-1)} className="absolute inset-y-0 left-0 z-10 h-auto w-auto rounded-none bg-gradient-to-r from-background to-transparent pr-6 pb-3 text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <ChevronLeft className="size-4" />
                </Button>
            )}
            <div ref={ref} onScroll={sync} className="flex gap-6 overflow-x-auto">
                {children}
            </div>
            {state.right && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll right" onClick={() => nudge(1)} className="absolute inset-y-0 right-0 z-10 h-auto w-auto rounded-none bg-gradient-to-l from-background to-transparent pb-3 pl-6 text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <ChevronRight className="size-4" />
                </Button>
            )}
        </div>
    )
}
