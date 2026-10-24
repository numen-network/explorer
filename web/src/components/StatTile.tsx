import {cn} from 'cn'
import {CircleQuestionMark} from 'lucide-react'
import Link from 'next/link'
import {ReactNode} from 'react'
import {Jump} from '@/components/links'
import {Tip} from '@/components/Tip'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'

export interface StatChip {
    text: ReactNode
    note: string
    tone: 'pos' | 'neg' | 'warn' | 'idle'
}

const CHIP_TONE = {pos: 'text-good', neg: 'text-destructive', warn: 'text-warn', idle: 'text-dim'} as const

interface Stat {
    label: string
    value: ReactNode
    href?: string
    tip?: string
}

// the arrow wraps along with the label's last word
export function StatLabel({label, href}: {label: string; href?: string}) {
    const cut = label.lastIndexOf(' ') + 1
    return href ? (
        <Link href={href} className="hover:text-primary">
            {label.slice(0, cut)}
            <span className="whitespace-nowrap">
                {label.slice(cut)} <Jump />
            </span>
        </Link>
    ) : (
        label
    )
}

export function StatChips({chips}: {chips: StatChip[]}) {
    return chips.map(c => (
        <span key={c.note}>
            <span className={CHIP_TONE[c.tone]}>{c.text}</span>
            <span className="text-dim"> · {c.note}</span>
        </span>
    ))
}

function StatFigure({label, value, href, tip, className}: Stat & {className?: string}) {
    return (
        <div className={cn('grid min-w-0 gap-1.5', className)}>
            <CardDescription className="text-xs">
                <StatLabel label={label} href={href} />
                {tip && (
                    <Tip text={tip}>
                        <CircleQuestionMark aria-label={tip} className="ml-1 inline size-3 align-[-1px]" />
                    </Tip>
                )}
            </CardDescription>
            <CardTitle className="text-[17px] leading-7 font-semibold tracking-tight wrap-anywhere sm:text-[19px]">{value}</CardTitle>
        </div>
    )
}

// stats beside the main one move to a line of their own rather than squeeze it.
// even shares the width out from sm up, pairs also keeps two to a line below it,
// row keeps a few short figures on one shared line at every width
export default function StatTile({
    label,
    value,
    href,
    beside = [],
    even,
    pairs,
    row,
    chips,
    className,
}: Stat & {beside?: Stat[]; even?: boolean; pairs?: boolean; row?: boolean; chips?: StatChip[]; className?: string}) {
    return (
        <Card className={cn('gap-1 py-3.5 sm:py-4 sm:[--card-spacing:--spacing(5)]', className)}>
            <CardHeader className={cn('gap-x-10 gap-y-2', row ? 'grid grid-flow-col auto-cols-fr gap-x-4 has-data-[slot=card-description]:grid-rows-none' : pairs ? 'grid grid-cols-2 gap-y-3 sm:grid-flow-col sm:grid-cols-none sm:grid-rows-[auto_auto] sm:auto-cols-fr' : even ? 'flex flex-col sm:flex-row sm:*:flex-1 sm:*:basis-0' : 'flex flex-wrap')}>
                {[{label, value, href}, ...beside].map(s => (
                    <StatFigure key={s.label} {...s} className={pairs ? 'row-span-2 grid-rows-subgrid' : undefined} />
                ))}
            </CardHeader>
            {chips && (
                <CardContent className="flex flex-wrap gap-x-2.5 text-xs">
                    <StatChips chips={chips} />
                </CardContent>
            )}
        </Card>
    )
}
