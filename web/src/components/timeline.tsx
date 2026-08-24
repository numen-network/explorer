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

export interface Step {
    block: number
    label: string
    iso?: string
    tone: keyof typeof DOT_TONE
    icon: string
}

// newest first, the rail reads down from what just happened
export default function Timeline({steps}: {steps: Step[]}) {
    return (
        <div className="card px-7 py-1">
            {steps.length === 0 && <div className="py-5 text-sm text-sub">None</div>}
            <ol className="ml-3 border-l border-edge">
                {[...steps].reverse().map((s, i) => (
                    <li key={i} className="relative border-t border-edge py-6 pl-9 first:border-t-0">
                        <span className={`absolute top-6 -left-[14px] grid size-7 place-items-center rounded-full ${DOT_TONE[s.tone]}`}>
                            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d={s.icon} />
                            </svg>
                        </span>
                        <div className="text-sm font-medium">{s.label}</div>
                        {s.iso && (
                            <div className="mt-1 text-xs text-sub">
                                <TimeCell iso={s.iso} cycle />
                            </div>
                        )}
                        <div className="mt-1.5 text-xs">
                            <BlockLink height={s.block} />
                        </div>
                    </li>
                ))}
            </ol>
        </div>
    )
}

export function rawSteps(timeline: unknown): {block: number; status: string}[] {
    if (!Array.isArray(timeline)) return []
    return (timeline as {block: number; status: string}[]).filter(s => typeof s?.block === 'number' && typeof s?.status === 'string')
}

export const sentenceCase = (s: string) => s[0].toUpperCase() + s.slice(1)
