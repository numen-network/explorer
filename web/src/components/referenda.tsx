import type {ReactNode} from 'react'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import {NONE} from '@/components/Detail'
import DotRow from '@/components/DotRow'
import {TimeCell} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {camelLabel, fmtPct, pctToNum, trackLabel} from '@/lib/format'
import type {ReferendumRow} from '@/lib/gql'
import {phaseOf, type Phase} from '@/lib/referendum'
import {ss58Encode} from '@/lib/ss58'

const PHASE_BG: Record<Phase, string> = {
    Submitted: 'bg-muted-foreground',
    Deciding: 'bg-primary',
    Confirming: 'bg-good',
    Approved: 'bg-good',
    Rejected: 'bg-destructive',
    TimedOut: 'bg-muted-foreground',
    Cancelled: 'bg-muted-foreground',
    Killed: 'bg-destructive',
}

export function StatusBadge({phase, className}: {phase: Phase; className?: string}) {
    return <Badge className={cn('shrink-0 rounded-md px-3 py-1.5 text-xs leading-none font-semibold', PHASE_BG[phase], className)}>{camelLabel(phase)}</Badge>
}

const PHASE_TONE: Record<Phase, 'primary' | 'pos' | 'neg' | 'idle'> = {
    Submitted: 'idle',
    Deciding: 'primary',
    Confirming: 'pos',
    Approved: 'pos',
    Rejected: 'neg',
    TimedOut: 'idle',
    Cancelled: 'idle',
    Killed: 'neg',
}

// the soft form a table row shows, in the tones PHASE_BG gives the cards
export function StatusTag({phase}: {phase: Phase}) {
    return <Badge variant={PHASE_TONE[phase]}>{camelLabel(phase)}</Badge>
}

export function ReferendumByline({r, chain, className}: {r: ReferendumRow; chain: ChainProps; className?: string}) {
    return (
        <div className={cn('flex flex-wrap items-center gap-2 text-xs', className)}>
            <DotRow className="min-w-0">
                {r.submitter ? <AccountLink addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} /> : NONE}
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs text-muted-foreground">
                    {trackLabel(r.track.name)}
                </Badge>
                <span className="-ml-0.5 text-muted-foreground">
                    <TimeCell iso={r.submittedTimestamp} cycle />
                </span>
            </DotRow>
            <StatusBadge phase={phaseOf(r)} className="ml-auto" />
        </div>
    )
}

// split reads green aye against red nay with the tally line between them,
// solid reads support against the issuance that never voted, the tick is
// what the curve demands right now
export function Gauge({value, need, variant, thin}: {value: number | null; need?: number | null; variant: 'split' | 'solid'; thin?: boolean}) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    const v = clamp(value ?? 0)
    return (
        <div className={cn('relative flex overflow-hidden rounded-full', thin ? 'h-1' : 'h-2')}>
            {value === null ? (
                <div className="flex-1 bg-border" />
            ) : (
                <>
                    <div className={variant === 'split' ? 'bg-good' : 'bg-support'} style={{width: `${v}%`}} />
                    {variant === 'split' && v > 0 && v < 100 && <div className={cn('shrink-0 bg-card', thin ? 'w-0.5' : 'w-[3px]')} />}
                    <div className={`flex-1 ${variant === 'split' ? 'bg-destructive' : 'bg-background'}`} />
                </>
            )}
            {need != null && <span className="absolute top-0 h-full w-px bg-foreground" style={{left: `${clamp(need)}%`}} />}
        </div>
    )
}

// both thresholds of a live referendum in a row's 40px slot, approval over support
export function ThresholdPair({ayes, nays, support, issuance, need}: {ayes: bigint; nays: bigint; support: bigint; issuance: bigint; need: {approval: number; support: number}}) {
    const cast = ayes + nays
    const line = (label: string, part: bigint, whole: bigint, at: number) => (
        <div>
            {label} {fmtPct(part, whole)} need {fmtPct(at, 100)}
        </div>
    )
    return (
        <Tip
            text={
                <div className="font-mono">
                    {line('Approval', ayes, cast, need.approval)}
                    {line('Support', support, issuance, need.support)}
                </div>
            }
        >
            <div data-slot="threshold-pair" className="flex w-10 shrink-0 flex-col gap-[3px] self-center">
                <Gauge value={cast > 0n ? pctToNum(ayes, cast) : null} need={need.approval} variant="split" thin />
                <Gauge value={issuance > 0n ? pctToNum(support, issuance) : null} need={need.support} variant="solid" thin />
            </div>
        </Tip>
    )
}

export function ThresholdBar({label, part, whole, need, variant, foot}: {label: string; part: bigint; whole: bigint; need: number; variant: 'split' | 'solid'; foot?: ReactNode}) {
    const value = whole > 0n ? pctToNum(part, whole) : null
    const tone = value === null ? 'text-muted-foreground' : value >= need ? 'text-good' : 'text-destructive'
    return (
        <div className="min-w-0">
            <div className="flex items-baseline justify-between gap-2 text-[11px]">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">
                    <span className={tone}>{fmtPct(part, whole)}</span>
                    <span className="text-muted-foreground"> need {fmtPct(need, 100)}</span>
                </span>
            </div>
            <div className="mt-1">
                <Gauge value={value} need={need} variant={variant} />
            </div>
            {foot && <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-muted-foreground">{foot}</div>}
        </div>
    )
}
