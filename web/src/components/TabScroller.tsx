'use client'
import {useEffect, useLayoutEffect, useRef, useState, type ReactNode} from 'react'
import {ChevronLeft, ChevronRight} from 'lucide-react'
import {Button} from '@/components/ui/button'

// its source also ships as the inline script below, so it may only touch its argument and globals
function reveal(strip: HTMLElement) {
    const tab = strip.querySelector('[aria-selected="true"], [aria-current="page"]')
    if (!tab) return
    const covered = parseFloat(getComputedStyle(strip).scrollPaddingLeft)
    const s = strip.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    const hidden = t.left < s.left + covered || t.right > s.right - covered
    if (hidden) strip.scrollLeft += (t.left + t.right - s.left - s.right) / 2
}

const REVEAL_SCRIPT = `(${reveal})(document.currentScript.previousElementSibling)`

// how far a wheel that counts in lines moves per line
const LINE = 40

// a mouse wheel turns the strip sideways until the strip runs out of room, and
// the page scrolls as usual from there. a gesture that already runs sideways
// stays the browser's
function wheelSideways(strip: HTMLElement) {
    return (e: WheelEvent) => {
        if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return
        // deltaMode counts the wheel in pixels, lines or pages
        const dy = e.deltaY * [1, LINE, strip.clientWidth][e.deltaMode]
        const room = dy > 0 ? strip.scrollWidth - strip.clientWidth - strip.scrollLeft : strip.scrollLeft
        if (room < 1) return
        e.preventDefault()
        strip.scrollLeft += dy
    }
}

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
    useLayoutEffect(() => reveal(ref.current!), [children])
    useEffect(() => {
        sync()
        const el = ref.current
        if (!el) return
        const ro = new ResizeObserver(sync)
        ro.observe(el)
        const onWheel = wheelSideways(el)
        el.addEventListener('wheel', onWheel, {passive: false})
        return () => {
            ro.disconnect()
            el.removeEventListener('wheel', onWheel)
        }
    }, [])
    const nudge = (dir: 1 | -1) => {
        const el = ref.current
        el?.scrollBy({left: dir * el.clientWidth * 0.6, behavior: 'smooth'})
    }
    // pb-3 mirrors the links' bottom band so the icon centers on the label line,
    // scroll-px-10.5 is the edge band an arrow hides, its 24px fade and 16px
    // icon inside a 1px border. the arrows stand in for the strip's scrollbar
    // and serve pointers only, a link that takes keyboard focus scrolls itself
    // clear of them
    return (
        <div className="relative -mb-px w-full">
            {state.left && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll left" tabIndex={-1} onClick={() => nudge(-1)} className="absolute inset-y-0 left-0 z-10 h-auto w-auto rounded-none bg-gradient-to-r from-background to-transparent pr-6 pb-3 text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <ChevronLeft className="size-4" />
                </Button>
            )}
            <div ref={ref} onScroll={sync} className="flex scroll-px-10.5 gap-6 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {children}
            </div>
            {/* the server copy runs as the html parses, before first paint. React
                never runs a script it inserts and warns about one, so client
                renders mark it text/plain */}
            <script type={typeof window === 'undefined' ? undefined : 'text/plain'} suppressHydrationWarning dangerouslySetInnerHTML={{__html: REVEAL_SCRIPT}} />
            {state.right && (
                <Button variant="ghost" size="icon-xs" aria-label="Scroll right" tabIndex={-1} onClick={() => nudge(1)} className="absolute inset-y-0 right-0 z-10 h-auto w-auto rounded-none bg-gradient-to-l from-background to-transparent pb-3 pl-6 text-muted-foreground hover:bg-transparent hover:text-foreground">
                    <ChevronRight className="size-4" />
                </Button>
            )}
        </div>
    )
}
