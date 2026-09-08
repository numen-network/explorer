'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {TREASURY, type WellKnown} from '@/lib/wellKnown'

const Ctx = createContext<string>('')

export function WellKnownProvider({treasury, children}: {treasury: string; children: ReactNode}) {
    return <Ctx value={treasury}>{children}</Ctx>
}

export function useWellKnown(addr: string): WellKnown | null {
    const treasury = useContext(Ctx)
    return addr === treasury ? TREASURY : null
}
