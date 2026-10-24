import Link from 'next/link'
import type {ReactNode} from 'react'
import {cn} from 'cn'
import TabScroller from '@/components/TabScroller'
import {Badge} from '@/components/ui/badge'
import {fmtInt} from '@/lib/format'

// links under a rule, the active bar sitting on that rule
const LINK = 'relative inline-flex flex-none items-center justify-center gap-1.5 px-1 pb-3 text-sm font-normal whitespace-nowrap text-muted-foreground transition-all after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring data-active:text-foreground data-active:after:opacity-100'

export interface TabItem {
    label: string
    count?: number
    href: string
    active: boolean
}

// the bold copy is hidden but still measured, so the strip holds its
// positions when the active tab moves
function Label({text, active}: {text: string; active: boolean}) {
    return (
        <span className="grid">
            <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
                {text}
            </span>
            <span className={cn('col-start-1 row-start-1', active && 'font-semibold')}>{text}</span>
        </span>
    )
}

function Caption({item}: {item: TabItem}) {
    return (
        <>
            <Label text={item.label} active={item.active} />
            {item.count != null && (
                <Badge variant="secondary" className="rounded-full px-2 text-muted-foreground">
                    {fmtInt(item.count)}
                </Badge>
            )}
        </>
    )
}

// a section title that switches what the card under it lists, as tall as a plain title
const HEADING = 'text-[17px] font-semibold whitespace-nowrap text-muted-foreground hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring data-active:text-foreground'

// a tab is a link, so the strip is the url and only the page being read is built.
// a tab switches the view in place, so the page keeps its scroll
export function TabNav({items, className, variant, 'aria-label': label}: {items: TabItem[]; className?: string; variant?: 'heading'; 'aria-label': string}) {
    if (variant === 'heading')
        return (
            <nav aria-label={label} className={cn('flex items-baseline gap-5', className)}>
                {items.map(t => (
                    <Link key={t.href} href={t.href} scroll={false} aria-current={t.active ? 'page' : undefined} data-active={t.active} className={HEADING}>
                        {t.label}
                        {t.count != null && <span className="ml-1.5 text-sm font-medium text-muted-foreground">{fmtInt(t.count)}</span>}
                    </Link>
                ))}
            </nav>
        )
    return (
        <nav aria-label={label} className={cn('flex items-center border-b', className)}>
            <TabScroller>
                {items.map(t => (
                    <Link key={t.href} href={t.href} scroll={false} aria-current={t.active ? 'page' : undefined} data-active={t.active} className={LINK}>
                        <Caption item={t} />
                    </Link>
                ))}
            </TabScroller>
        </nav>
    )
}

export interface Panel {
    slug: string
    label: string
    count?: number
    body: () => ReactNode
}

// the open panel, the one the url names or else the first, and the strip
// linking every panel
export function panelTabs(panels: Panel[], at: string | undefined, href: (slug: string) => string) {
    const active = panels.find(p => p.slug === at) ?? panels[0]
    const items = panels.map((p): TabItem => ({label: p.label, count: p.count, href: href(p.slug), active: p === active}))
    return {active, items}
}
