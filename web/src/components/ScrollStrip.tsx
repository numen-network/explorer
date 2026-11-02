'use client'
import {useEffect, useRef, useState, type ReactNode, type RefObject} from 'react'
import {ChevronLeft, ChevronRight} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {cn} from 'cn'

interface Props {
    children: ReactNode
    className?: string
    stripClassName?: string
    stripRef?: RefObject<HTMLDivElement | null>
}

// the arrows stand in for the scrollbar and serve pointers only. a focused
// item scrolls itself clear of them
export default function ScrollStrip({children, className, stripClassName, stripRef}: Props) {
    const own = useRef<HTMLDivElement>(null)
    const ref = stripRef ?? own
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
        const ro = new ResizeObserver(sync)
        ro.observe(ref.current!)
        return () => ro.disconnect()
    }, [])
    const nudge = (dir: 1 | -1) => ref.current?.scrollBy({left: dir * ref.current.clientWidth * 0.6, behavior: 'smooth'})
    // pb-3 mirrors a tab's bottom band, so the icon centers on the label line.
    // scroll-px-10.5 is the edge band an arrow hides. a 24px fade plus a 16px
    // icon inside a 1px border
    const arrow = 'absolute inset-y-0 z-10 h-auto w-auto rounded-none from-background to-transparent pb-3 text-muted-foreground hover:bg-transparent hover:text-foreground'
    return (
        <div className={cn('relative', className)}>
            {state.left && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll left" tabIndex={-1} onClick={() => nudge(-1)} className={cn(arrow, 'left-0 bg-gradient-to-r pr-6')}>
                    <ChevronLeft className="size-4" />
                </Button>
            )}
            <div ref={ref} onScroll={sync} className={cn('flex scroll-px-10.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', stripClassName)}>
                {children}
            </div>
            {state.right && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll right" tabIndex={-1} onClick={() => nudge(1)} className={cn(arrow, 'right-0 bg-gradient-to-l pl-6')}>
                    <ChevronRight className="size-4" />
                </Button>
            )}
        </div>
    )
}
