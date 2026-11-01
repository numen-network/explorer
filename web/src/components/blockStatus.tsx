'use client'

import {createContext, useContext, useEffect, useState, type ReactNode} from 'react'
import {CircleCheckBig, ClockFading} from 'lucide-react'
import {StatusDot} from '@/components/pills'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {Heads} from '@/lib/chain'

const Ctx = createContext<Heads | null>(null)

export function HeadsProvider({heads, children}: {heads: Heads; children: ReactNode}) {
    return <Ctx value={heads}>{children}</Ctx>
}

function useHeads(): Heads {
    const heads = useContext(Ctx)
    if (!heads) throw new Error('block status needs the chain heads')
    return heads
}

const FINALIZED = {label: 'Finalized', tone: 'pos', Icon: CircleCheckBig, iconTone: 'text-good'} as const
const CONFIRMING = {label: 'Confirming', tone: 'warn', Icon: ClockFading, iconTone: 'text-warn'} as const

const finality = (height: number, heads: Heads) => (height <= heads.finalized ? FINALIZED : CONFIRMING)

// the root layout only re-renders on router.refresh(), so poll between refreshes.
// the newer of the two heads wins
export function LiveHeads({rendered, ms, children}: {rendered: Heads; ms: number; children: ReactNode}) {
    const [polled, setPolled] = useState(rendered)
    useEffect(() => {
        const t = setInterval(async () => {
            if (document.hidden) return
            const res = await fetch('/api/heads', {cache: 'no-store'}).catch(() => null)
            if (res?.ok) setPolled(await res.json())
        }, ms)
        return () => clearInterval(t)
    }, [ms])
    return <HeadsProvider heads={polled.indexed > rendered.indexed ? polled : rendered}>{children}</HeadsProvider>
}

// a height past both heads isn't indexed yet and gets no mark
export function BlockStatus({height}: {height: number}) {
    const heads = useContext(Ctx)
    if (!heads || height > Math.max(heads.finalized, heads.indexed)) return null
    const {Icon, label, iconTone} = finality(height, heads)
    return (
        <Tip text={label}>
            <Icon role="img" aria-label={label} className={`size-[0.95em] shrink-0 ${iconTone}`} />
        </Tip>
    )
}

export function FinalityDot({height}: {height: number}) {
    const {label, tone} = finality(height, useHeads())
    return (
        <>
            <StatusDot tone={tone} />
            <span>{label}</span>
        </>
    )
}

export function FinalityBadge({height}: {height: number}) {
    const {label, tone} = finality(height, useHeads())
    return <Badge variant={tone}>{label}</Badge>
}
