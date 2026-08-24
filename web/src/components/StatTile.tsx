import Link from 'next/link'
import {ReactNode} from 'react'
import {Jump} from '@/components/links'

export interface StatChip {
    text: string
    note: string
    tone: 'pos' | 'neg' | 'idle'
}

const CHIP_TONE = {pos: 'text-pos', neg: 'text-neg', idle: 'text-faint'} as const

export default function StatTile({label, value, chips, href}: {label: string; value: ReactNode; chips?: StatChip[]; href?: string}) {
    return (
        <div className="card px-4 py-3.5 sm:px-5 sm:py-4">
            <div className="text-xs text-sub">
                {href ? (
                    <Link href={href} className="hover:text-accent">
                        {label} <Jump />
                    </Link>
                ) : (
                    label
                )}
            </div>
            <div className="mt-1.5 truncate text-[17px] leading-7 font-semibold tracking-tight sm:text-[19px]">{value}</div>
            {chips && (
                <div className="mt-1 flex flex-wrap gap-x-4 text-xs">
                    {chips.map(c => (
                        <span key={c.note} className="whitespace-nowrap">
                            <span className={CHIP_TONE[c.tone]}>{c.text}</span>
                            <span className="text-faint"> · {c.note}</span>
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}
