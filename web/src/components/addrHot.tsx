'use client'

import {useEffect, type ReactNode} from 'react'
import {create} from 'zustand'

const HOT = 'rounded-[4px] bg-primary-soft ring-1 ring-primary/30'

const useHot = create<{addr: string | null; set: (addr: string | null) => void}>(set => ({addr: null, set: addr => set({addr})}))

export function useAddrHot(addr: string) {
    const on = useHot(s => s.addr === addr)
    const set = useHot(s => s.set)
    useEffect(
        () => () => {
            if (useHot.getState().addr === addr) set(null)
        },
        [addr, set]
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
