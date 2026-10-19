import Link from 'next/link'
import type {ReactNode} from 'react'
import {cn} from 'cn'
import TabScroller from '@/components/TabScroller'
import {Badge} from '@/components/ui/badge'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {fmtInt} from '@/lib/format'

export type TabVariant = 'line' | 'pill' | 'segment'

const LINK = 'relative inline-flex items-center justify-center gap-1.5 font-normal whitespace-nowrap transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring'

// line is the page strip, links under a rule with the active bar sitting on
// that rule. pill is a bordered strip where the active pill takes the page
// colour, segment is one solid control where the active cell fills with the
// accent
const STYLE: Record<TabVariant, {strip: string; link: string}> = {
    line: {
        strip: 'flex items-center border-b',
        link: 'flex-none px-1 pb-3 text-sm text-muted-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:opacity-0 after:transition-opacity hover:text-foreground data-active:text-foreground data-active:after:opacity-100',
    },
    pill: {
        strip: 'flex h-8 w-fit items-center justify-center gap-1 rounded-lg border bg-card p-0.5',
        link: 'h-full flex-1 rounded-lg px-2.5 text-sm text-muted-foreground hover:text-primary data-active:bg-background data-active:font-medium data-active:text-foreground data-active:hover:text-foreground',
    },
    segment: {
        strip: 'flex h-8 w-fit items-center justify-center overflow-hidden rounded-lg border bg-card',
        link: 'h-full flex-1 px-3.5 text-sm text-foreground hover:text-primary data-active:bg-primary data-active:font-medium data-active:text-primary-foreground data-active:hover:text-primary-foreground',
    },
}

// cancels the chrome shadcn's tabs bring, leaving TabPanels with the line look
const TABS_RESET = {
    list: 'w-full p-0 group-data-horizontal/tabs:h-auto',
    trigger: 'h-auto rounded-none border-0 pt-0 group-data-horizontal/tabs:after:bottom-0',
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

function Caption({item, variant}: {item: TabItem; variant: TabVariant}) {
    return (
        <>
            {variant === 'line' ? <Label text={item.label} active={item.active} /> : item.label}
            {item.count != null && (
                <Badge variant="secondary" className="rounded-full px-2 text-muted-foreground">
                    {fmtInt(item.count)}
                </Badge>
            )}
        </>
    )
}

// a tab is a link, so the strip is the url and only the page being read is built.
// a tab switches the view in place, so the page keeps its scroll
export function TabBar({items, variant = 'line', className, 'aria-label': label}: {items: TabItem[]; variant?: TabVariant; className?: string; 'aria-label': string}) {
    const links = items.map(t => (
        <Link key={t.href} href={t.href} scroll={false} aria-current={t.active ? 'page' : undefined} data-active={t.active} className={cn(LINK, STYLE[variant].link)}>
            <Caption item={t} variant={variant} />
        </Link>
    ))
    return (
        <nav aria-label={label} className={cn(STYLE[variant].strip, className)}>
            {variant === 'line' ? <TabScroller>{links}</TabScroller> : links}
        </nav>
    )
}

// the pill strip for a view that switches in place, the triggers of a shadcn
// Tabs root rather than links, with shadcn's own chrome taken off
// sm sits beside content rather than among the filter controls
export function TabSwitch({options, size = 'default', className}: {options: [value: string, label: string][]; size?: 'default' | 'sm'; className?: string}) {
    const sm = size === 'sm'
    return (
        <TabsList className={cn(STYLE.pill.strip, sm && 'h-6 group-data-horizontal/tabs:h-6 rounded-md', className)}>
            {options.map(([value, label]) => (
                <TabsTrigger key={value} value={value} className={cn(LINK, STYLE.pill.link, 'border-0 group-data-[variant=default]/tabs-list:data-active:shadow-none', sm && 'rounded-[5px] px-2 text-xs')}>
                    {label}
                </TabsTrigger>
            ))}
        </TabsList>
    )
}

export interface Panel {
    slug: string
    label: string
    count?: number
    body: () => ReactNode
}

function Trigger({item}: {item: TabItem}) {
    return (
        <TabsTrigger value={item.href} asChild className={cn(LINK, STYLE.line.link, TABS_RESET.trigger)}>
            <Link href={item.href}>
                <Caption item={item} variant="line" />
            </Link>
        </TabsTrigger>
    )
}

export function TabPanels({panels, at, href, className = 'mt-7'}: {panels: Panel[]; at?: string; href: (slug: string) => string; className?: string}) {
    if (panels.length === 0) return null
    const active = panels.find(p => p.slug === at) ?? panels[0]
    return (
        <Tabs value={href(active.slug)} className={cn('gap-4', className)}>
            <TabsList variant="line" className={cn(STYLE.line.strip, TABS_RESET.list)}>
                <TabScroller>
                    {panels.map(p => (
                        <Trigger key={p.slug} item={{label: p.label, count: p.count, href: href(p.slug), active: p.slug === active.slug}} />
                    ))}
                </TabScroller>
            </TabsList>
            <TabsContent value={href(active.slug)} className="leading-normal">
                {active.body()}
            </TabsContent>
        </Tabs>
    )
}
