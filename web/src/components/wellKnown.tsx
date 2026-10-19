'use client'

import {createContext, useContext, type ReactNode} from 'react'
import {CONFIG, type WellKnown} from '@/lib/config'

const Ctx = createContext({treasury: '', prime: '', evmChainId: 0})

export function WellKnownProvider({treasury, prime, evmChainId, children}: {treasury: string; prime: string; evmChainId: number; children: ReactNode}) {
    return <Ctx value={{treasury, prime, evmChainId}}>{children}</Ctx>
}

export function useWellKnown(addr: string): WellKnown | null {
    const {treasury, prime} = useContext(Ctx)
    if (addr === treasury) return CONFIG.wellKnown.treasury
    if (addr === prime) return CONFIG.wellKnown.prime
    return null
}

export function useTokenIcon(addr: string): string | undefined {
    return CONFIG.networks[useContext(Ctx).evmChainId]?.tokenIcons[addr]
}
