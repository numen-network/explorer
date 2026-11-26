'use client'

import Link from 'next/link'
import {createContext, useContext, type ReactNode} from 'react'
import {AddrMark} from '@/components/addrHot'
import HashText from '@/components/HashText'
import {Tip} from '@/components/Tip'
import {CONFIG, wellKnownAccount, type WellKnown} from '@/lib/config'

const Ctx = createContext({treasury: '', prime: '', evmChainId: 0})

export function WellKnownProvider({treasury, prime, evmChainId, children}: {treasury: string; prime: string; evmChainId: number; children: ReactNode}) {
    return <Ctx value={{treasury, prime, evmChainId}}>{children}</Ctx>
}

export function useWellKnown(addr: string): WellKnown | null {
    const {treasury, prime, evmChainId} = useContext(Ctx)
    if (addr === treasury) return CONFIG.wellKnown.treasury
    if (addr === prime) return CONFIG.wellKnown.prime
    return wellKnownAccount(addr, evmChainId)
}

export function useTokenIcon(addr: string): string | undefined {
    return CONFIG.networks[useContext(Ctx).evmChainId]?.tokenIcons[addr]
}

export function WellKnownEvmAddr({addr, full = false}: {addr: string; full?: boolean}) {
    const known = useWellKnown(addr)
    if (!known) {
        return (
            <Tip text={full ? undefined : addr}>
                <AddrMark addr={addr} render={<Link href={`/address/${addr}`} className="font-mono text-primary hover:underline" />}>
                    <HashText hash={addr} full={full} />
                </AddrMark>
            </Tip>
        )
    }
    return (
        <span className="inline-flex max-w-full min-w-0 items-center align-top">
            <Tip text={<span className="font-mono">{addr}</span>} align="start" sideOffset={14}>
                <AddrMark addr={addr} render={<Link href={`/address/${addr}`} className="flex min-w-0 items-center gap-1 hover:text-primary" />}>
                    <span className="shrink-0" aria-hidden>
                        {known.emoji}
                    </span>
                    <span className="truncate font-medium">{known.label}</span>
                </AddrMark>
            </Tip>
        </span>
    )
}
