import Link from 'next/link'
import {fmtInt} from '@/lib/format'
import {CONTROL} from '@/lib/ui'

interface Props {
    page: number
    pageCount: number
    href: (page: number) => string
    className?: string
}

export default function Pager({page, pageCount, href, className = 'mt-3'}: Props) {
    const btn = `${CONTROL} px-3 py-1.5 hover:text-accent`
    const off = 'pointer-events-none opacity-40'
    return (
        <div className={`flex items-center justify-end gap-3 text-sm ${className}`}>
            <span className="text-xs text-sub">
                Page {fmtInt(page)} of {fmtInt(Math.max(1, pageCount))}
            </span>
            <Link href={href(page - 1)} className={`${btn} ${page <= 1 ? off : ''}`}>
                ← Prev
            </Link>
            <Link href={href(page + 1)} className={`${btn} ${page >= pageCount ? off : ''}`}>
                Next →
            </Link>
        </div>
    )
}
