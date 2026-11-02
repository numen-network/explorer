'use client'
import {useEffect, useRef, useState, type ReactNode, type RefObject} from 'react'
import {ChevronLeft, ChevronRight} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {cn} from 'cn'

// line suits a row of text. its pb-3 mirrors a tab's bottom band, so the icon
// centers on the label. disc suits taller items, with a finger-sized circle.
// both fill the 42px edge band that scroll-px-10.5 keeps clear
const LOOKS = {
    line: {
        band: 'pb-3 text-muted-foreground hover:text-foreground',
        left: 'pr-6',
        right: 'pl-6',
        face: 'flex',
        icon: 'size-4',
    },
    disc: {
        band: 'w-10.5',
        left: 'justify-start',
        right: 'justify-end',
        face: 'flex size-9 items-center justify-center rounded-full border bg-card text-foreground shadow-sm group-hover/button:bg-muted',
        icon: 'size-5',
    },
}

interface Props {
    children: ReactNode
    look: keyof typeof LOOKS
    className?: string
    stripClassName?: string
    stripRef?: RefObject<HTMLDivElement | null>
}

// the arrows stand in for the scrollbar and serve pointers only. a focused
// item scrolls itself clear of them
export default function ScrollStrip({children, look, className, stripClassName, stripRef}: Props) {
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
    const l = LOOKS[look]
    const arrow = 'absolute inset-y-0 z-10 h-auto w-auto rounded-none bg-origin-border bg-clip-border from-background to-transparent hover:bg-transparent'
    return (
        <div className={cn('relative', className)}>
            {state.left && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll left" tabIndex={-1} onClick={() => nudge(-1)} className={cn(arrow, 'left-0 bg-gradient-to-r', l.band, l.left)}>
                    <span className={l.face}>
                        <ChevronLeft className={l.icon} />
                    </span>
                </Button>
            )}
            <div ref={ref} onScroll={sync} className={cn('flex scroll-px-10.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden', stripClassName)}>
                {children}
            </div>
            {state.right && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll right" tabIndex={-1} onClick={() => nudge(1)} className={cn(arrow, 'right-0 bg-gradient-to-l', l.band, l.right)}>
                    <span className={l.face}>
                        <ChevronRight className={l.icon} />
                    </span>
                </Button>
            )}
        </div>
    )
}
