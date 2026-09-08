import type {ReactNode} from 'react'
import {Check, Circle, X, type LucideIcon} from 'lucide-react'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
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

export interface Step {
    block: number
    label: string
    iso?: string
    tone: Tone
    icon: LucideIcon
}

// the rail shell every timeline shares
export function TimelineList({empty, children}: {empty?: boolean; children: ReactNode}) {
    return (
        <Card size="flush" className="px-7 py-1">
            {empty && <div className="py-5 text-sm text-muted-foreground">None</div>}
            <ol className="ml-3 border-l">{children}</ol>
        </Card>
    )
}

// one rail entry, the detail column only exists where a page supplies one
export function TimelineItem({tone, icon: Icon, title, iso, links, detail}: {tone: Tone; icon: LucideIcon; title: ReactNode; iso?: string; links?: ReactNode; detail?: ReactNode}) {
    return (
        <li
            className={`relative border-t py-6 pl-9 first:border-t-0 ${
                detail ? 'grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 lg:grid-cols-[300px_minmax(0,1fr)]' : ''
            }`}
        >
            <span className={`absolute top-6 -left-[14px] grid size-7 place-items-center rounded-full ${DOT_TONE[tone]}`}>
                <Icon className="size-[15px]" strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
                <div className="text-sm font-medium">{title}</div>
                {iso && (
                    <div className="mt-1 text-xs text-muted-foreground">
                        <TimeCell iso={iso} cycle />
                    </div>
                )}
                {links && <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">{links}</div>}
            </div>
            {detail}
        </li>
    )
}

// the label value list a detail column renders
export function TimelineRows({rows}: {rows: [string, ReactNode][]}) {
    return (
        <dl className="space-y-2 text-sm">
            {rows.map(([label, value]) => (
                <div key={label} className="flex gap-4">
                    <dt className="w-40 shrink-0 text-muted-foreground">{label}</dt>
                    <dd className="min-w-0 break-all">{value}</dd>
                </div>
            ))}
        </dl>
    )
}

// newest first, the rail reads down from what just happened
export default function Timeline({steps}: {steps: Step[]}) {
    return (
        <TimelineList empty={steps.length === 0}>
            {[...steps].reverse().map((s, i) => (
                <TimelineItem key={i} tone={s.tone} icon={s.icon} title={s.label} iso={s.iso} links={<BlockLink height={s.block} />} />
            ))}
        </TimelineList>
    )
}

export function rawSteps(timeline: unknown): {block: number; status: string; timestamp: string; event?: string}[] {
    if (!Array.isArray(timeline)) return []
    return (timeline as {block: number; status: string; timestamp: string; event?: string}[]).filter(s => typeof s?.block === 'number' && typeof s?.status === 'string' && typeof s?.timestamp === 'string')
}
