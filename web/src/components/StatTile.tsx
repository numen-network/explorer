import Link from 'next/link'
import {ReactNode} from 'react'
import {Jump} from '@/components/links'
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from '@/components/ui/card'

export interface StatChip {
    text: string
    note: string
    tone: 'pos' | 'neg' | 'idle'
}

const CHIP_TONE = {pos: 'text-good', neg: 'text-destructive', idle: 'text-dim'} as const

export default function StatTile({label, value, chips, href}: {label: string; value: ReactNode; chips?: StatChip[]; href?: string}) {
    return (
        <Card className="gap-1 py-3.5 sm:py-4 sm:[--card-spacing:--spacing(5)]">
            <CardHeader className="gap-1.5">
                <CardDescription className="text-xs">
                    {href ? (
                        <Link href={href} className="hover:text-primary">
                            {label} <Jump />
                        </Link>
                    ) : (
                        label
                    )}
                </CardDescription>
                <CardTitle className="text-[17px] leading-7 font-semibold tracking-tight break-words sm:text-[19px]">{value}</CardTitle>
            </CardHeader>
            {chips && (
                <CardContent className="flex flex-wrap gap-x-4 text-xs">
                    {chips.map(c => (
                        <span key={c.note} className="whitespace-nowrap">
                            <span className={CHIP_TONE[c.tone]}>{c.text}</span>
                            <span className="text-dim"> · {c.note}</span>
                        </span>
                    ))}
                </CardContent>
            )}
        </Card>
    )
}
