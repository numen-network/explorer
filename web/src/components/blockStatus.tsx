'use client'

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react'
import {CircleCheckBig, ClockFading} from 'lucide-react'
import {Tip} from '@/components/Tip'
import type {Heads} from '@/lib/chain'

const Ctx = createContext<Heads | null>(null)

export function HeadsProvider({heads, children}: {heads: Heads; children: ReactNode}) {
    return <Ctx value={heads}>{children}</Ctx>
}

// the root layout doesn't re-render on navigation, so poll to keep the heads current
export function LiveHeads({initial, ms, children}: {initial: Heads; ms: number; children: ReactNode}) {
    const [heads, setHeads] = useState(initial)
    useEffect(() => {
        const t = setInterval(async () => {
            if (document.hidden) return
            const res = await fetch('/api/heads', {cache: 'no-store'}).catch(() => null)
            if (res?.ok) setHeads(await res.json())
        }, ms)
        return () => clearInterval(t)
    }, [ms])
    return <HeadsProvider heads={heads}>{children}</HeadsProvider>
}

// a height past both heads isn't indexed yet and gets no mark
export function BlockStatus({height}: {height: number}) {
    const heads = useContext(Ctx)
    if (!heads || height > Math.max(heads.finalized, heads.indexed)) return null
    const [Icon, label, tone] = height <= heads.finalized ? [CircleCheckBig, 'Finalized', 'text-good'] : [ClockFading, 'Confirming', 'text-warn']
    return (
        <Tip text={label}>
            <Icon role="img" aria-label={label} className={`size-[0.95em] shrink-0 ${tone}`} />
        </Tip>
    )
}
