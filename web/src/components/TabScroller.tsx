'use client'
import {useEffect, useLayoutEffect, useRef, type ReactNode} from 'react'
import ScrollStrip from './ScrollStrip'

// its source also ships as the inline script below, so it may only touch its argument and globals
function reveal(strip: HTMLElement) {
    const tab = strip.querySelector('[aria-current="page"]')
    if (!tab) return
    const covered = parseFloat(getComputedStyle(strip).scrollPaddingLeft)
    const s = strip.getBoundingClientRect()
    const t = tab.getBoundingClientRect()
    const hidden = t.left < s.left + covered || t.right > s.right - covered
    if (hidden) strip.scrollLeft += (t.left + t.right - s.left - s.right) / 2
}

const REVEAL_SCRIPT = `(${reveal})(document.currentScript.parentElement)`

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
    useLayoutEffect(() => reveal(ref.current!), [children])
    useEffect(() => {
        const el = ref.current!
        const onWheel = wheelSideways(el)
        el.addEventListener('wheel', onWheel, {passive: false})
        return () => el.removeEventListener('wheel', onWheel)
    }, [])
    return (
        <ScrollStrip look="line" className="-mb-px w-full" stripClassName="gap-6" stripRef={ref}>
            {children}
            {/* the server copy runs as the html parses, before first paint. React
                never runs a script it inserts and warns about one, so client
                renders mark it text/plain */}
            <script type={typeof window === 'undefined' ? undefined : 'text/plain'} suppressHydrationWarning dangerouslySetInnerHTML={{__html: REVEAL_SCRIPT}} />
        </ScrollStrip>
    )
}
