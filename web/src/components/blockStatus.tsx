'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {CircleCheckBig, ClockFading} from 'lucide-react'
import {StatusDot} from '@/components/pills'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {Heads} from '@/lib/chain'

const Ctx = createContext<Heads | null>(null)

export function HeadsProvider({heads, children}: {heads: Heads; children: ReactNode}) {
    return <Ctx value={heads}>{children}</Ctx>
}

export function useHeads(): Heads {
    const heads = useContext(Ctx)
    if (!heads) throw new Error('block status needs the chain heads')
    return heads
}

const FINALIZED = {label: 'Finalized', tone: 'pos', Icon: CircleCheckBig, iconTone: 'text-good'} as const
const CONFIRMING = {label: 'Confirming', tone: 'warn', Icon: ClockFading, iconTone: 'text-warn'} as const

const finality = (height: number, heads: Heads) => (height <= heads.finalized ? FINALIZED : CONFIRMING)

// heights past the indexed head get no mark
export function BlockStatus({height}: {height: number}) {
    const heads = useContext(Ctx)
    if (!heads || height > heads.indexed) return null
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
