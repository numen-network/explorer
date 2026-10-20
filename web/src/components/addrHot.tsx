'use client'

import {useEffect, type ComponentProps, type MouseEvent} from 'react'
import {Slot} from 'radix-ui'
import {create} from 'zustand'
import {cn} from 'cn'

// the negative margin keeps the text in place while the box clears it
const BOX = '-mx-1 rounded-[4px] px-1'
const HOT = 'bg-primary-soft ring-1 ring-primary/30'

const useHot = create<{addr: string | null; set: (addr: string | null) => void}>(set => ({addr: null, set: addr => set({addr})}))

type Handler = ((e: MouseEvent<HTMLSpanElement>) => void) | undefined

const then = (handler: Handler, run: () => void) => (e: MouseEvent<HTMLSpanElement>) => {
    handler?.(e)
    run()
}

// every place showing the address lights up while the pointer is on one of them
export function AddrMark({addr, asChild = false, className, onMouseEnter, onMouseMove, onMouseLeave, onClick, ...props}: ComponentProps<'span'> & {addr: string; asChild?: boolean}) {
    const on = useHot(s => s.addr === addr)
    const set = useHot(s => s.set)
    useEffect(
        () => () => {
            if (useHot.getState().addr === addr) set(null)
        },
        [addr, set]
    )
    const Comp = asChild ? Slot.Root : 'span'
    return (
        <Comp
            {...props}
            className={cn(BOX, on && HOT, className)}
            onMouseEnter={then(onMouseEnter, () => set(addr))}
            onMouseMove={then(onMouseMove, () => set(addr))}
            onMouseLeave={then(onMouseLeave, () => set(null))}
            onClick={then(onClick, () => set(null))}
        />
    )
}
