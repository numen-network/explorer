'use client'

import {useEffect, useRef, type ReactNode} from 'react'
import {flushSync} from 'react-dom'
import {createRoot, type Root} from 'react-dom/client'

// echarts measures what the formatter returns, so the render has to land before it does
export function useChartTip() {
    const tip = useRef<{box: HTMLElement; root: Root}>(null)
    useEffect(
        () => () => {
            const root = tip.current?.root
            tip.current = null
            queueMicrotask(() => root?.unmount())
        },
        []
    )
    return (node: ReactNode): HTMLElement => {
        if (!tip.current) {
            const box = document.createElement('div')
            box.dataset.chartTip = ''
            tip.current = {box, root: createRoot(box)}
        }
        const {box, root} = tip.current
        flushSync(() => root.render(node))
        return box
    }
}
