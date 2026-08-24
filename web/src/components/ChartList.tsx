'use client'
import Link from 'next/link'
import {useState} from 'react'
import {CHARTS, GROUPS} from '@/lib/charts'

const ITEM = 'block rounded-lg px-3 py-1.5 text-[13px] leading-snug'

export default function ChartList({active, className = ''}: {active: string; className?: string}) {
    const [q, setQ] = useState('')
    const needle = q.trim().toLowerCase()
    const hits = needle ? CHARTS.filter(c => c.title.toLowerCase().includes(needle) || c.group.toLowerCase().includes(needle)) : CHARTS

    return (
        <nav className={`${className} lg:sticky lg:top-6`}>
            <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by chart name"
                spellCheck={false}
                className="w-full border-b border-edge bg-transparent px-3 py-2 text-sm outline-none placeholder:text-faint"
            />
            <div className="mt-3 space-y-4">
                {GROUPS.filter(g => hits.some(c => c.group === g)).map(g => (
                    <div key={g}>
                        <div className="px-3 text-xs font-medium text-sub">{g}</div>
                        <div className="mt-1 space-y-0.5">
                            {hits
                                .filter(c => c.group === g)
                                .map(c => (
                                    <Link
                                        key={c.slug}
                                        href={`/charts/${c.slug}`}
                                        className={`${ITEM} ${c.slug === active ? 'bg-accent/8 font-medium text-accent' : 'hover:bg-bg'}`}
                                    >
                                        {c.title}
                                    </Link>
                                ))}
                        </div>
                    </div>
                ))}
                {hits.length === 0 && <div className="px-3 text-[13px] text-sub">No chart by that name.</div>}
            </div>
        </nav>
    )
}
