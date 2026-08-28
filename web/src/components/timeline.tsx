import type {ReactNode} from 'react'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'

export const TICK = 'M3.6 8.3l3 3 5.8-6.6'
export const CROSS = 'M4.8 4.8l6.4 6.4m0-6.4l-6.4 6.4'
export const RING = 'M8 4.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2'

const DOT_TONE = {
    pos: 'bg-pos-soft text-pos',
    warn: 'bg-[#fdf3e2] text-warn',
    neg: 'bg-neg-soft text-neg',
    idle: 'bg-bg text-sub',
    accent: 'bg-accent-soft text-accent',
} as const

export type Tone = keyof typeof DOT_TONE

export interface Step {
    block: number
    label: string
    iso?: string
    tone: Tone
    icon: string
}

// the rail shell every timeline shares
export function TimelineList({empty, children}: {empty?: boolean; children: ReactNode}) {
    return (
        <div className="card px-7 py-1">
            {empty && <div className="py-5 text-sm text-sub">None</div>}
            <ol className="ml-3 border-l border-edge">{children}</ol>
        </div>
    )
}

// one rail entry, the detail column only exists where a page supplies one
export function TimelineItem({tone, icon, title, iso, links, detail}: {tone: Tone; icon: string; title: ReactNode; iso?: string; links?: ReactNode; detail?: ReactNode}) {
    return (
        <li
            className={`relative border-t border-edge py-6 pl-9 first:border-t-0 ${
                detail ? 'grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 lg:grid-cols-[300px_minmax(0,1fr)]' : ''
            }`}
        >
            <span className={`absolute top-6 -left-[14px] grid size-7 place-items-center rounded-full ${DOT_TONE[tone]}`}>
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                </svg>
            </span>
            <div className="min-w-0">
                <div className="text-sm font-medium">{title}</div>
                {iso && (
                    <div className="mt-1 text-xs text-sub">
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
                    <dt className="w-40 shrink-0 text-sub">{label}</dt>
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

export function rawSteps(timeline: unknown): {block: number; status: string; event?: string}[] {
    if (!Array.isArray(timeline)) return []
    return (timeline as {block: number; status: string; event?: string}[]).filter(s => typeof s?.block === 'number' && typeof s?.status === 'string')
}

export const sentenceCase = (s: string) => s[0].toUpperCase() + s.slice(1)
