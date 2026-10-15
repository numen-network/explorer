import {cn} from 'cn'
import Link from 'next/link'
import {ReactNode} from 'react'
import {Jump} from '@/components/links'
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
}

function StatFigure({label, value, href}: Stat) {
    return (
        <div className="grid min-w-0 gap-1.5">
            <CardDescription className="text-xs">
                {href ? (
                    <Link href={href} className="hover:text-primary">
                        {label} <Jump />
                    </Link>
                ) : (
                    label
                )}
            </CardDescription>
            <CardTitle className="text-[17px] leading-7 font-semibold tracking-tight wrap-anywhere sm:text-[19px]">{value}</CardTitle>
        </div>
    )
}

// stats beside the main one move to a line of their own rather than squeeze it
export default function StatTile({label, value, href, beside = [], chips, className}: Stat & {beside?: Stat[]; chips?: StatChip[]; className?: string}) {
    return (
        <Card className={cn('gap-1 py-3.5 sm:py-4 sm:[--card-spacing:--spacing(5)]', className)}>
            <CardHeader className="flex flex-wrap gap-x-10 gap-y-2">
                {[{label, value, href}, ...beside].map(s => (
                    <StatFigure key={s.label} {...s} />
                ))}
            </CardHeader>
            {chips && (
                <CardContent className="flex flex-wrap gap-x-4 text-xs">
                    {chips.map(c => (
                        <span key={c.note}>
                            <span className={CHIP_TONE[c.tone]}>{c.text}</span>
                            <span className="text-dim"> · {c.note}</span>
                        </span>
                    ))}
                </CardContent>
            )}
        </Card>
    )
}
