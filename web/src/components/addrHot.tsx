'use client'

import {useEffect, useSyncExternalStore, type ReactNode} from 'react'

const HOT = 'rounded-[4px] bg-accent-soft ring-1 ring-accent/30'

let hot: string | null = null
const subs = new Set<() => void>()

const subscribe = (f: () => void) => {
    subs.add(f)
    return () => {
        subs.delete(f)
    }
}

const set = (a: string | null) => {
    if (a === hot) return
    hot = a
    subs.forEach(f => f())
}

export function useAddrHot(addr: string) {
    const on = useSyncExternalStore(
        subscribe,
        () => hot === addr,
        () => false
    )
    useEffect(
        () => () => {
            if (hot === addr) set(null)
        },
        [addr]
    )
    return {
        cls: on ? HOT : '',
        onMouseEnter: () => set(addr),
        onMouseMove: () => set(addr),
        onMouseLeave: () => set(null),
        onClick: () => set(null),
    }
}

export function AddrMark({addr, className = '', children}: {addr: string; className?: string; children: ReactNode}) {
    const {cls, ...handlers} = useAddrHot(addr)
    return (
        <span className={`${className} ${cls}`} {...handlers}>
            {children}
        </span>
    )
}
