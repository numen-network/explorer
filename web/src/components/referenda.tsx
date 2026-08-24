import type {ReactNode} from 'react'
import {fmtCompact, planckToNum} from '@/lib/format'

const STATUS_BG: Record<string, string> = {
    SUBMITTED: 'bg-sub',
    DECIDING: 'bg-accent',
    CONFIRMING: 'bg-pos',
    APPROVED: 'bg-pos',
    REJECTED: 'bg-neg',
    TIMEDOUT: 'bg-sub',
    CANCELLED: 'bg-sub',
    KILLED: 'bg-neg',
}

export function StatusBadge({status, className = ''}: {status: string; className?: string}) {
    return (
        <span className={`shrink-0 rounded-md px-3 py-1.5 text-xs leading-none font-semibold text-white ${STATUS_BG[status] ?? 'bg-sub'} ${className}`}>
            {status[0] + status.slice(1).toLowerCase()}
        </span>
    )
}

// split reads green aye against red nay with the tally line between them,
// solid reads support against the issuance that never voted, the tick is
// what the curve demands right now
export function Gauge({value, need, variant}: {value: number | null; need?: number | null; variant: 'split' | 'solid'}) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    const v = clamp(value ?? 0)
    return (
        <div className="relative flex h-2 overflow-hidden rounded-full">
            {value === null ? (
                <div className="flex-1 bg-edge" />
            ) : (
                <>
                    <div className={variant === 'split' ? 'bg-pos' : 'bg-accent'} style={{width: `${v}%`}} />
                    {variant === 'split' && v > 0 && v < 100 && <div className="w-[3px] shrink-0 bg-card" />}
                    <div className={`flex-1 ${variant === 'split' ? 'bg-neg' : 'bg-bg'}`} />
                </>
            )}
            {need != null && <span className="absolute top-0 h-full w-px bg-ink" style={{left: `${clamp(need)}%`}} />}
        </div>
    )
}

export function TallyBar({r, decimals, className = 'w-40'}: {r: {ayes: string; nays: string}; decimals: number; className?: string}) {
    const ayes = planckToNum(r.ayes, decimals)
    const nays = planckToNum(r.nays, decimals)
    const total = ayes + nays
    return (
        <div className={className}>
            <Gauge value={total > 0 ? (ayes / total) * 100 : null} variant="split" />
            <div className="mt-1 flex justify-between font-mono text-[10px] text-sub">
                <span>aye {fmtCompact(ayes)}</span>
                <span>nay {fmtCompact(nays)}</span>
            </div>
        </div>
    )
}

export function ThresholdBar({label, value, need, variant, foot}: {label: string; value: number | null; need: number; variant: 'split' | 'solid'; foot?: ReactNode}) {
    const pass = value !== null && value >= need
    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-sub">{label}</span>
                <span className="font-mono">
                    <span className={pass ? 'text-pos' : 'text-neg'}>{(value ?? 0).toFixed(1)}%</span>
                    <span className="text-sub"> need {need.toFixed(1)}%</span>
                </span>
            </div>
            <div className="mt-1">
                <Gauge value={value} need={need} variant={variant} />
            </div>
            {foot && <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-sub">{foot}</div>}
        </div>
    )
}
