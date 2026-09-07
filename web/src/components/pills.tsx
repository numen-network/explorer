import Link from 'next/link'
import {cn} from 'cn'
import {Badge} from '@/components/ui/badge'
import {fmtInt} from '@/lib/format'

export function FilterChip({label, count, href, active}: {label: string; count?: number; href: string; active: boolean}) {
    return (
        <Badge asChild variant={active ? 'solid' : 'idle'} className={cn('rounded-full px-3 py-1 text-xs', active ? 'font-medium' : 'bg-card hover:text-foreground')}>
            <Link href={href}>
                {label}
                {count != null && <span className={cn('ml-1.5', active ? 'text-primary-foreground/70' : 'text-dim')}>{fmtInt(count)}</span>}
            </Link>
        </Badge>
    )
}

const DOT_TONE = {
    pos: 'bg-good',
    warn: 'bg-warn',
    neg: 'bg-destructive',
    idle: 'bg-dim',
} as const

export function StatusDot({tone}: {tone: keyof typeof DOT_TONE}) {
    return <span className={`inline-block size-1.5 shrink-0 rounded-full ${DOT_TONE[tone]}`} />
}
