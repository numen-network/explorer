import {ArrowDown, ArrowDownUp, ArrowUp} from 'lucide-react'
import Link from 'next/link'
import {cn} from 'cn'

// a column heading that sorts the list through the url, the arrow showing
// which way it runs when it is the column leading
export default function SortHead({label, href, dir}: {label: string; href: string; dir?: 'asc' | 'desc'}) {
    const Icon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowDownUp
    return (
        <Link href={href} scroll={false} className={cn('inline-flex items-center gap-1 hover:text-foreground', dir && 'text-foreground')}>
            {label}
            <Icon aria-hidden className={cn('size-3', dir ? 'text-primary' : 'text-dim')} />
        </Link>
    )
}
