import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import {Inter} from 'next/font/google'
import Footer from '@/components/Footer'
import IndexerBanner from '@/components/IndexerBanner'
import Nav from '@/components/Nav'
import SearchBar from '@/components/SearchBar'
import {TooltipProvider} from '@/components/ui/tooltip'
import {WellKnownProvider} from '@/components/wellKnown'
import {chainProps} from '@/lib/chain'
import {primeState} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import './globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-inter'})

export const metadata: Metadata = {
    title: {default: 'Numen Explorer', template: '%s · Numen Explorer'},
    description: 'Block explorer for the Numen chain',
}

export default async function RootLayout({children}: {children: ReactNode}) {
    const [chain, prime] = await Promise.all([
        chainProps().then(
            p => p,
            () => null
        ),
        primeState().then(
            r => r.primeStates[0]?.account.id,
            () => undefined
        ),
    ])
    const addr = (hex: string | undefined) => (chain && hex ? ss58Encode(hex, chain.ss58) : '')
    return (
        <html lang="en" className={inter.variable}>
            <body className="flex min-h-dvh flex-col">
                <WellKnownProvider treasury={addr(chain?.treasuryAccount)} prime={addr(prime)} evmChainId={chain?.evmChainId ?? 0}>
                    <TooltipProvider>
                        <Nav chain={chain?.chain ?? ''} />
                        <div className="mx-auto w-full max-w-[1400px] grow px-6 pb-16">
                            <div className="mt-5">
                                <SearchBar />
                            </div>
                            <IndexerBanner />
                            {children}
                        </div>
                        <Footer />
                    </TooltipProvider>
                </WellKnownProvider>
            </body>
        </html>
    )
}
