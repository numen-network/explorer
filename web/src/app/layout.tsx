import type {Metadata} from 'next'
import type {ReactNode} from 'react'
import {Inter} from 'next/font/google'
import Footer from '@/components/Footer'
import IndexerBanner from '@/components/IndexerBanner'
import Nav from '@/components/Nav'
import SearchBar from '@/components/SearchBar'
import {chainProps} from '@/lib/chain'
import './globals.css'

const inter = Inter({subsets: ['latin'], variable: '--font-inter'})

export const metadata: Metadata = {
    title: {default: 'Numen Explorer', template: '%s · Numen Explorer'},
    description: 'Block explorer for the Numen chain',
    icons: '/logo.svg',
}

export default async function RootLayout({children}: {children: ReactNode}) {
    const chain = await chainProps().then(
        p => p.chain,
        () => ''
    )
    return (
        <html lang="en" className={inter.variable}>
            <body className="flex min-h-dvh flex-col">
                <Nav chain={chain} />
                <div className="mx-auto w-full max-w-[1400px] grow px-6 pb-16">
                    <div className="mt-5">
                        <SearchBar />
                    </div>
                    <IndexerBanner />
                    {children}
                </div>
                <Footer />
            </body>
        </html>
    )
}
