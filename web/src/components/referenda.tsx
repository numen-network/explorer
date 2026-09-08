import type {ReactNode} from 'react'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {camelLabel, fmtBalance, fmtCompact, fmtDaySpan, planckToNum} from '@/lib/format'
import type {AccountRef, ProposalNode} from '@/lib/gql'
import type {Phase} from '@/lib/referendum'
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

// split reads green aye against red nay with the tally line between them,
// solid reads support against the issuance that never voted, the tick is
// what the curve demands right now
export function Gauge({value, need, variant}: {value: number | null; need?: number | null; variant: 'split' | 'solid'}) {
    const clamp = (n: number) => Math.min(100, Math.max(0, n))
    const v = clamp(value ?? 0)
    return (
        <div className="relative flex h-2 overflow-hidden rounded-full">
            {value === null ? (
                <div className="flex-1 bg-border" />
            ) : (
                <>
                    <div className={variant === 'split' ? 'bg-good' : 'bg-support'} style={{width: `${v}%`}} />
                    {variant === 'split' && v > 0 && v < 100 && <div className="w-[3px] shrink-0 bg-card" />}
                    <div className={`flex-1 ${variant === 'split' ? 'bg-destructive' : 'bg-background'}`} />
                </>
            )}
            {need != null && <span className="absolute top-0 h-full w-px bg-foreground" style={{left: `${clamp(need)}%`}} />}
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
            <div className="mt-1 flex justify-between font-mono text-[10px] text-muted-foreground">
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
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">
                    <span className={pass ? 'text-good' : 'text-destructive'}>{(value ?? 0).toFixed(1)}%</span>
                    <span className="text-muted-foreground"> need {need.toFixed(1)}%</span>
                </span>
            </div>
            <div className="mt-1">
                <Gauge value={value} need={need} variant={variant} />
            </div>
            {foot && <div className="mt-1 flex justify-between gap-2 font-mono text-[10px] text-muted-foreground">{foot}</div>}
        </div>
    )
}

/** How many payouts a proposal books, which is what makes one staged. */
export const payouts = (nodes: ProposalNode[] | null) => (nodes ?? []).filter(node => node.amount != null).length

// a payout the chain still holds back says how long is left on it
function release(validFrom: number | null | undefined, best: number, blockTime: number): string {
    if (validFrom == null || validFrom <= best) return 'immediately'
    return `in ${fmtDaySpan(validFrom - best, blockTime)}`
}

/**
 * The call a referendum runs, read out as the tree the chain would run.
 * Depth is the indent, and a spend says what it pays and when it opens.
 */
export function ProposalTree({nodes, chain, best, party}: {nodes: ProposalNode[]; chain: ChainProps; best: number; party: Map<string, AccountRef>}) {
    return (
        <div className="divide-y">
            {nodes.map((node, i) => (
                <div key={i} className="flex flex-col gap-1 px-5 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <span className="shrink-0 font-mono text-[13px]" style={{paddingLeft: `${node.depth * 22}px`}}>
                        {node.pallet}.{node.method}
                    </span>
                    {node.amount != null && node.beneficiary != null && (
                        <span className="flex min-w-0 flex-wrap items-center gap-2">
                            <span className="font-semibold">{fmtBalance(node.amount, chain.decimals, chain.symbol)}</span>
                            <span className="text-muted-foreground">to</span>
                            <AccountLink addr={ss58Encode(node.beneficiary, chain.ss58)} acc={party.get(node.beneficiary)} />
                            <span className="text-dim">{release(node.validFrom, best, chain.blockTime)}</span>
                        </span>
                    )}
                </div>
            ))}
        </div>
    )
}
