'use client'
import Link from 'next/link'
import {useState} from 'react'
import {cn} from 'cn'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {CHARTS, GROUPS} from '@/lib/charts'

export default function ChartList({active, className = ''}: {active: string; className?: string}) {
    const [q, setQ] = useState('')
    const needle = q.trim().toLowerCase()
    const hits = needle ? CHARTS.filter(c => c.title.toLowerCase().includes(needle) || c.group.toLowerCase().includes(needle)) : CHARTS

    return (
        <nav className={`${className} lg:sticky lg:top-6`}>
            <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search by chart name" spellCheck={false} className="h-auto rounded-none border-0 border-b px-3 py-2 text-sm placeholder:text-dim focus-visible:border-border focus-visible:ring-0 md:text-sm" />
            <div className="mt-3 space-y-4">
                {GROUPS.filter(g => hits.some(c => c.group === g)).map(g => (
                    <div key={g}>
                        <div className="px-3 text-xs font-medium text-muted-foreground">{g}</div>
                        <div className="mt-1 space-y-0.5">
                            {hits
                                .filter(c => c.group === g)
                                .map(c => (
                                    <Button key={c.slug} asChild variant="ghost" size="sm" className={cn('h-auto w-full justify-start rounded-lg border-0 px-3 py-1.5 text-[13px] leading-snug font-normal whitespace-normal', c.slug === active && 'bg-primary/8 font-medium text-primary hover:bg-primary/8 hover:text-primary')}>
                                        <Link href={`/charts/${c.slug}`}>{c.title}</Link>
                                    </Button>
                                ))}
                        </div>
                    </div>
                ))}
                {hits.length === 0 && <div className="px-3 text-[13px] text-muted-foreground">No chart by that name.</div>}
            </div>
        </nav>
    )
}
