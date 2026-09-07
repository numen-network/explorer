'use client'
import Link from 'next/link'
import {usePathname} from 'next/navigation'
import {useState} from 'react'
import {Menu} from 'lucide-react'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
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
    const tone = (href: string) => ((href === '/' ? path === '/' : path.startsWith(href)) ? 'font-medium text-primary' : 'hover:text-primary')
    return (
        <header className="border-b bg-card">
            <div className="mx-auto flex h-14 max-w-[1400px] items-center gap-7 px-6">
                <div className="flex shrink-0 items-center gap-1">
                    <Sheet open={open} onOpenChange={setOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" aria-label="Menu" className="-ml-2 size-9 hover:bg-transparent xl:hidden">
                                <Menu className="size-5" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" aria-describedby={undefined} className="gap-0 overflow-y-auto bg-card p-6 data-[side=left]:w-72">
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
                            Numen<span className="font-normal text-muted-foreground"> Explorer</span>
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
                {chain && (
                    <Badge variant="outline" className="ml-auto bg-background px-2 py-1 text-xs text-muted-foreground">
                        {chain}
                    </Badge>
                )}
            </div>
        </header>
    )
}
