'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useState} from 'react'
import {Sheet, SheetContent, SheetTitle, SheetTrigger} from '@/components/ui/sheet'

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
    const [open, setOpen] = useState(false)
    const tone = (href: string) => ((href === '/' ? path === '/' : path.startsWith(href)) ? 'font-medium text-accent' : 'hover:text-accent')
    return (
        <header className="border-b border-edge bg-card">
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-7 px-6">
                <div className="flex shrink-0 items-center gap-1">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            {/* burger geometry is a lucide icon under ISC, inlined */}
                            <button type="button" aria-label="Menu" className="-ml-2 p-2 xl:hidden">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 6h16" />
                                    <path d="M4 12h16" />
                                    <path d="M4 18h16" />
                                </svg>
                            </button>
                        </SheetTrigger>
                        <SheetContent aria-describedby={undefined}>
                            <SheetTitle className="sr-only">Menu</SheetTitle>
                            <nav className="mt-6 text-sm">
                                {ITEMS.map(([href, label]) => (
                                    <Link key={href} href={href} onClick={() => setOpen(false)} className={`block py-2 ${tone(href)}`}>
                                        {label}
                                    </Link>
                                ))}
                            </nav>
                        </SheetContent>
                    </Sheet>
                    <Link href="/" className="flex items-center gap-2">
                        <img src="/logo.svg" width={18} height={18} alt="" />
                        <span className="text-[16px] font-bold tracking-tight">
                            Numen<span className="font-normal text-sub"> Explorer</span>
                        </span>
                    </Link>
                </div>
                {/* eleven labels fit beside the brand only on a wide screen,
                    so narrower screens tuck them behind the burger */}
                <nav className="hidden items-center gap-6 text-sm xl:flex">
                    {ITEMS.map(([href, label]) => (
                        <Link key={href} href={href} className={`whitespace-nowrap ${tone(href)}`}>
                            {label}
                        </Link>
                    ))}
                </nav>
                {chain && <span className="ml-auto rounded-md border border-edge bg-bg px-2 py-1 text-xs whitespace-nowrap text-sub">{chain}</span>}
            </div>
        </header>
    )
}
