'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {PRIME, TREASURY, type WellKnown} from '@/lib/wellKnown'

const Ctx = createContext({treasury: '', prime: ''})

export function WellKnownProvider({treasury, prime, children}: {treasury: string; prime: string; children: ReactNode}) {
    return <Ctx value={{treasury, prime}}>{children}</Ctx>
}

export function useWellKnown(addr: string): WellKnown | null {
    const {treasury, prime} = useContext(Ctx)
    if (addr === treasury) return TREASURY
    if (addr === prime) return PRIME
    return null
}
