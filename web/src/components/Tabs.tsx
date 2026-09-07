import Link from 'next/link'
import type {ReactNode} from 'react'
import {cn} from 'cn'
import TabScroller from '@/components/TabScroller'
import {Badge} from '@/components/ui/badge'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {fmtInt} from '@/lib/format'

export type TabVariant = 'line' | 'pill' | 'segment'

// line is the page strip, links under a rule with the active bar sitting on
// that rule. pill is a bordered strip where the active pill takes the page
// colour, segment is one solid control where the active cell fills with the
// accent
const STYLE: Record<TabVariant, {list: string; trigger: string}> = {
    line: {
        list: 'h-auto w-full justify-start gap-6 border-b p-0 group-data-horizontal/tabs:h-auto',
        trigger: 'h-auto flex-none rounded-none border-0 px-1 pt-0 pb-3 font-normal text-muted-foreground hover:text-foreground data-active:text-foreground group-data-horizontal/tabs:after:bottom-0 data-active:after:bg-primary',
    },
    pill: {
        list: 'h-auto gap-1 rounded-lg border bg-card p-0.5 group-data-horizontal/tabs:h-auto',
        trigger: 'h-auto rounded-lg border-0 px-2.5 py-1 text-xs font-normal text-muted-foreground hover:text-primary data-active:bg-background data-active:font-medium data-active:text-foreground data-active:shadow-none! data-active:hover:text-foreground',
    },
    segment: {
        list: 'h-auto gap-0 overflow-hidden rounded-lg border bg-card p-0 group-data-horizontal/tabs:h-auto',
        trigger: 'h-auto rounded-none border-0 px-3.5 py-1.5 text-sm font-normal text-foreground hover:text-primary data-active:bg-primary data-active:font-medium data-active:text-primary-foreground data-active:shadow-none! data-active:hover:text-primary-foreground',
    },
}

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

function Trigger({item, variant}: {item: TabItem; variant: TabVariant}) {
    return (
        <TabsTrigger value={item.href} asChild className={STYLE[variant].trigger}>
            <Link href={item.href}>
                {variant === 'line' ? <Label text={item.label} active={item.active} /> : item.label}
                {item.count != null && (
                    <Badge variant="secondary" className="rounded-full px-2 text-muted-foreground">
                        {fmtInt(item.count)}
                    </Badge>
                )}
            </Link>
        </TabsTrigger>
    )
}

// a tab is a link, so the strip is the url and only the page being read is built
export function TabBar({items, variant = 'line', className}: {items: TabItem[]; variant?: TabVariant; className?: string}) {
    const active = items.find(t => t.active) ?? items[0]
    const strip = items.map(t => <Trigger key={t.href} item={t} variant={variant} />)
    return (
        <Tabs value={active?.href} className={className}>
            <TabsList variant={variant === 'line' ? 'line' : 'default'} className={STYLE[variant].list}>
                {variant === 'line' ? <TabScroller>{strip}</TabScroller> : strip}
            </TabsList>
        </Tabs>
    )
}

export interface Panel {
    slug: string
    label: string
    count?: number
    body: () => ReactNode
}

export function TabPanels({panels, at, href, className = 'mt-7'}: {panels: Panel[]; at?: string; href: (slug: string) => string; className?: string}) {
    if (panels.length === 0) return null
    const active = panels.find(p => p.slug === at) ?? panels[0]
    return (
        <Tabs value={href(active.slug)} className={cn('gap-4', className)}>
            <TabsList variant="line" className={STYLE.line.list}>
                <TabScroller>
                    {panels.map(p => (
                        <Trigger key={p.slug} item={{label: p.label, count: p.count, href: href(p.slug), active: p.slug === active.slug}} variant="line" />
                    ))}
                </TabScroller>
            </TabsList>
            <TabsContent value={href(active.slug)} className="leading-normal">
                {active.body()}
            </TabsContent>
        </Tabs>
    )
}
