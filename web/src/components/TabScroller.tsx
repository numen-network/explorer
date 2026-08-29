'use client'
import {useEffect, useRef, useState, type ReactNode} from 'react'

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
    // chevron geometry comes from lucide under ISC, inlined
    const chev = (d: string) => (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d={d} />
        </svg>
    )
    // pb-3 mirrors the links' bottom band so the icon centers on the label line
    return (
        <div className="relative -mb-px">
            {state.left && (
                <button
                    type="button"
                    aria-label="Scroll left"
                    onClick={() => nudge(-1)}
                    className="absolute inset-y-0 left-0 z-10 flex items-center bg-gradient-to-r from-bg to-transparent pr-6 pb-3 text-sub hover:text-ink"
                >
                    {chev('m15 18-6-6 6-6')}
                </button>
            )}
            <div ref={ref} onScroll={sync} className="flex gap-6 overflow-x-auto">
                {children}
            </div>
            {state.right && (
                <button
                    type="button"
                    aria-label="Scroll right"
                    onClick={() => nudge(1)}
                    className="absolute inset-y-0 right-0 z-10 flex items-center bg-gradient-to-l from-bg to-transparent pb-3 pl-6 text-sub hover:text-ink"
                >
                    {chev('m9 18 6-6-6-6')}
                </button>
            )}
        </div>
    )
}
