import Link from 'next/link'
import type {ReactNode} from 'react'
import {fmtInt} from '@/lib/format'

const BASE = 'flex items-center border-b-2 px-1 pb-2.5 text-sm whitespace-nowrap'
const ON = 'border-accent'
const OFF = 'border-transparent text-sub hover:text-ink'
const STRIP = 'border-b border-edge'
const ROW = '-mb-px flex gap-6 overflow-x-auto'

// the bold copy is hidden but still measured, so the strip holds its
// positions when the active tab moves
function Label({text, active}: {text: string; active: boolean}) {
    return (
        <span className="grid">
            <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">{text}</span>
            <span className={`col-start-1 row-start-1 ${active ? 'font-semibold' : ''}`}>{text}</span>
        </span>
    )
}

function Count({n}: {n: number}) {
    return <span className="ml-1.5 rounded-full bg-bg px-2 py-0.5 text-[11px] font-normal text-sub">{fmtInt(n)}</span>
}

export function TabBar({items}: {items: {label: string; count?: number; href: string; active: boolean}[]}) {
    return (
        <div className={STRIP}>
            <div className={ROW}>
                {items.map(t => (
                    <Link key={t.label} href={t.href} className={`${BASE} ${t.active ? ON : OFF}`}>
                        <Label text={t.label} active={t.active} />
                        {t.count != null && <Count n={t.count} />}
                    </Link>
                ))}
            </div>
        </div>
    )
}

export interface Panel {
    slug: string
    label: string
    count?: number
    body: () => ReactNode
}

// tabs live in the url, so a tab is linkable and only the one being read ends
// up in the payload. body is a thunk because the others never get built
export function TabPanels({panels, at, href, className = 'mt-7'}: {panels: Panel[]; at?: string; href: (slug: string) => string; className?: string}) {
    if (panels.length === 0) return null
    const active = panels.find(p => p.slug === at) ?? panels[0]
    return (
        <div className={className}>
            <TabBar items={panels.map(p => ({label: p.label, count: p.count, href: href(p.slug), active: p.slug === active.slug}))} />
            <div className="mt-4">{active.body()}</div>
        </div>
    )
}
