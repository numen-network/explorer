'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'

const ITEMS: [string, string][] = [
    ['/', 'Home'],
    ['/blocks', 'Blocks'],
    ['/transfers', 'Transfers'],
    ['/extrinsics', 'Extrinsics'],
    ['/accounts', 'Accounts'],
    ['/identities', 'Identities'],
    ['/tokens', 'Tokens'],
    ['/governance', 'Governance'],
    ['/validators', 'Validators'],
    ['/miners', 'Miners'],
    ['/charts', 'Charts'],
]

export default function Nav({chain}: {chain: string}) {
    const path = usePathname()
    return (
        <header className="border-b border-edge bg-card">
            <div className="mx-auto flex max-w-[1400px] flex-wrap items-center px-6 md:h-14 md:flex-nowrap md:gap-7">
                <Link href="/" className="flex h-14 shrink-0 items-center gap-2">
                    <img src="/logo.svg" width={18} height={18} alt="" />
                    <span className="text-[16px] font-bold tracking-tight">
                        Numen<span className="font-normal text-sub"> Explorer</span>
                    </span>
                </Link>
                {chain && <span className="ml-auto rounded-md border border-edge bg-bg px-2 py-1 text-xs whitespace-nowrap text-sub md:order-3">{chain}</span>}
                {/* eleven labels cannot share a row with the brand on a phone,
                    so the strip takes its own line and scrolls edge to edge */}
                <nav className="rail -mx-6 flex w-full items-center gap-6 overflow-x-auto border-t border-edge px-6 py-2.5 text-sm md:order-2 md:mx-0 md:w-auto md:border-0 md:px-0 md:py-0">
                    {ITEMS.map(([href, label]) => {
                        const active = href === '/' ? path === '/' : path.startsWith(href)
                        return (
                            <Link key={href} href={href} className={`whitespace-nowrap ${active ? 'font-medium text-accent' : 'hover:text-accent'}`}>
                                {label}
                            </Link>
                        )
                    })}
                </nav>
            </div>
        </header>
    )
}
