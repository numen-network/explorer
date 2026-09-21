'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {PRIME, TOKEN_ICONS, TREASURY, type WellKnown} from '@/lib/wellKnown'

const Ctx = createContext({treasury: '', prime: '', evmChainId: 0})

export function WellKnownProvider({treasury, prime, evmChainId, children}: {treasury: string; prime: string; evmChainId: number; children: ReactNode}) {
    return <Ctx value={{treasury, prime, evmChainId}}>{children}</Ctx>
}

export function useWellKnown(addr: string): WellKnown | null {
    const {treasury, prime} = useContext(Ctx)
    if (addr === treasury) return TREASURY
    if (addr === prime) return PRIME
    return null
}

export function useTokenIcon(addr: string): string | undefined {
    return TOKEN_ICONS[useContext(Ctx).evmChainId]?.[addr]
}
