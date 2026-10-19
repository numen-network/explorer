import Link from 'next/link'
import {cn} from 'cn'
import LinkSelect from '@/components/LinkSelect'
import {Badge} from '@/components/ui/badge'
import {fmtInt} from '@/lib/format'

export function FilterChip({label, count, href, active}: {label: string; count?: number; href: string; active: boolean}) {
    return (
        <Badge asChild variant={active ? 'solid' : 'idle'} className={cn('rounded-full px-3 py-1 text-xs', active ? 'font-medium' : 'bg-card hover:text-foreground')}>
            <Link href={href} scroll={false}>
                {label}
                {count != null && <span className={cn('ml-1.5', active ? 'text-primary-foreground/70' : 'text-dim')}>{fmtInt(count)}</span>}
            </Link>
        </Badge>
    )
}

interface FilterRowProps {
    label: string
    values: string[]
    value: string
    href: (value: string) => string
    labelOf?: (value: string) => string
    counts?: Record<string, number>
    allCount?: number
    className?: string
    labelClassName?: string
}

// a value counting 0 drops out, but All and the active value always stay, so
// a filter that matches nothing can still be undone
export function FilterRow({label, values, value, href, labelOf = v => v, counts, allCount, className, labelClassName}: FilterRowProps) {
    const shown = values.filter(v => !counts || counts[v] > 0 || v === value)
    return (
        <div className={cn('flex flex-wrap items-center gap-2', className)}>
            <span className={cn('mr-1 shrink-0 text-xs text-muted-foreground', labelClassName)}>{label}</span>
            <FilterChip label="All" count={allCount} href={href('')} active={!value} />
            {shown.map(v => (
                <FilterChip key={v} label={labelOf(v)} count={counts?.[v]} href={href(v)} active={v === value} />
            ))}
        </div>
    )
}

// the select form of a filter row, for a group holding a filter with many
// values. every value stays listed, one counting 0 too, and the select also
// leaves room for the labels in fit
export function FilterSelect({label, values, value, href, labelOf = v => v, counts, allCount, fit, className, labelClassName}: FilterRowProps & {fit?: string[]}) {
    const options = [{label: 'All', count: allCount, href: href('')}, ...values.map(v => ({label: labelOf(v), count: counts && (counts[v] ?? 0), href: href(v)}))]
    return (
        <div className={cn('flex min-w-0 items-center gap-2', className)}>
            <span className={cn('mr-1 shrink-0 text-xs text-muted-foreground', labelClassName)}>{label}</span>
            <LinkSelect label={label} options={options} value={href(value)} fit={fit} />
        </div>
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
