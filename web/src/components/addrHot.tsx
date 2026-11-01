'use client'

import {useEffect} from 'react'
import {mergeProps} from '@base-ui/react/merge-props'
import {useRender} from '@base-ui/react/use-render'
import {create} from 'zustand'
import {cn} from 'cn'

// the negative margin keeps the text in place while the box clears it
const BOX = '-mx-1 rounded-[4px] px-1'
const HOT = 'bg-primary-soft ring-1 ring-primary/30'

const useHot = create<{addr: string | null; set: (addr: string | null) => void}>(set => ({addr: null, set: addr => set({addr})}))

// every place showing the address lights up while the pointer is on one of them
export function AddrMark({addr, render, className, ...props}: useRender.ComponentProps<'span'> & {addr: string}) {
    const on = useHot(s => s.addr === addr)
    const set = useHot(s => s.set)
    useEffect(
        () => () => {
            if (useHot.getState().addr === addr) set(null)
        },
        [addr, set]
    )
    return useRender({
        defaultTagName: 'span',
        render,
        props: mergeProps<'span'>(
            {
                className: cn(BOX, on && HOT, className),
                onMouseEnter: () => set(addr),
                onMouseMove: () => set(addr),
                onMouseLeave: () => set(null),
                onClick: () => set(null),
            },
            props
        ),
    })
}
