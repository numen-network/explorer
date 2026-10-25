import type {ReactNode} from 'react'
import {Box, Check, Circle, ScrollText, X, Zap, type LucideIcon} from 'lucide-react'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink, EventLink, ExtrinsicLink} from '@/components/links'
import {Card} from '@/components/ui/card'

export const TICK: LucideIcon = Check
export const CROSS: LucideIcon = X
export const RING: LucideIcon = Circle

const DOT_TONE = {
    pos: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    neg: 'bg-destructive-soft text-destructive',
    idle: 'bg-background text-muted-foreground',
    primary: 'bg-primary-soft text-primary',
} as const

export type Tone = keyof typeof DOT_TONE

// the rail shell every timeline shares, its width is what the steps lay out by
export function TimelineList({empty, children}: {empty?: boolean; children: ReactNode}) {
    return (
        <Card size="flush" className="px-7 py-1">
            {empty && <div className="py-5 text-sm text-muted-foreground">None</div>}
            <ol className="@container/timeline ml-3 border-l">{children}</ol>
        </Card>
    )
}

// one rail entry, the detail column only exists where a page supplies one. it
// sits beside the title once the list holds the 2.25rem inset, the 300px
// title, the 2.5rem gap and the 20rem its rows need side by side, and drops
// below the title short of that
export function TimelineItem({tone, icon: Icon, title, iso, links, detail}: {tone: Tone; icon: LucideIcon; title: ReactNode; iso?: string; links?: ReactNode; detail?: ReactNode}) {
    return (
        <li
            className={`relative border-t py-6 pl-9 first:border-t-0 ${
                detail ? 'grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 @min-[43.5rem]/timeline:grid-cols-[300px_minmax(0,1fr)]' : ''
            }`}
        >
            <span className={`absolute top-6 -left-[14px] grid size-7 place-items-center rounded-full ${DOT_TONE[tone]}`}>
                <Icon className="size-[15px]" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
                <div className="text-sm font-medium wrap-anywhere">{title}</div>
                {iso && (
                    <div className="mt-1 text-xs text-muted-foreground">
                        <TimeCell iso={iso} cycle />
                    </div>
                )}
                {links && <div className="mt-1.5 flex flex-col items-start gap-1 text-xs sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">{links}</div>}
            </div>
            {detail}
        </li>
    )
}

// the label value list a detail column renders. a label sits beside its value
// once the 10rem label and the 1rem gap leave the value 9rem, room for
// 550,000,000 NUMN, an address or an error such as InsufficientPermission, and
// above it short of that
export function TimelineRows({rows}: {rows: [string, ReactNode][]}) {
    return (
        <dl className="@container/rows space-y-2 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5 @min-[20rem]/rows:flex-row @min-[20rem]/rows:gap-4">
                    <dt className="shrink-0 text-muted-foreground @min-[20rem]/rows:w-40">{label}</dt>
                    <dd className="min-w-0 wrap-anywhere">{value}</dd>
                </div>
            ))}
        </dl>
    )
}

function Tagged({icon: Icon, children}: {icon: LucideIcon; children: ReactNode}) {
    return (
        <span data-slot="step-link" className="inline-flex items-center gap-1">
            <Icon className="size-3 shrink-0 text-muted-foreground" />
            {children}
        </span>
    )
}

export function StepLinks({block, event}: {block: number; event?: {indexInBlock: number; extrinsic: {id: string} | null}}) {
    return (
        <>
            <Tagged icon={Box}>
                <BlockLink height={block} />
            </Tagged>
            {event?.extrinsic && (
                <Tagged icon={ScrollText}>
                    <ExtrinsicLink id={event.extrinsic.id} />
                </Tagged>
            )}
            {event && (
                <Tagged icon={Zap}>
                    <EventLink height={block} index={event.indexInBlock} />
                </Tagged>
            )}
        </>
    )
}

export interface RawStep {
    event: string
    name: string
    block: number
    timestamp: string
    /** What an enactment dispatch failed with, null when it went through. */
    error?: string | null
}

export function rawSteps(timeline: unknown): RawStep[] {
    if (!Array.isArray(timeline)) return []
    return (timeline as RawStep[]).filter(s => typeof s?.block === 'number' && typeof s?.name === 'string' && typeof s?.timestamp === 'string')
}
