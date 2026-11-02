import Approx from '@/components/Approx'
import type {VoteChange} from '@/lib/conviction'
import {fmtPctMove, sentenceCase} from '@/lib/format'

const TONE: Record<string, string> = {aye: 'text-good', nay: 'text-destructive'}

const DecisionName = ({decision}: {decision: string}) => <span className={TONE[decision] ?? 'text-muted-foreground'}>{sentenceCase(decision)}</span>

function ReplacedVote({change: {from, to}, decimals}: {change: VoteChange; decimals: number}) {
    const delta = to.weight - from.weight
    if (from.decision !== to.decision) {
        return (
            <div className="text-xs text-dim">
                from <DecisionName decision={from.decision} /> <Approx planck={from.weight} decimals={decimals} />
            </div>
        )
    }
    if (delta === 0n) return <div className="text-xs text-dim">±0</div>
    return (
        <div className={`text-xs ${delta > 0n ? 'text-good' : 'text-destructive'}`}>
            <Approx planck={delta} decimals={decimals} move />
        </div>
    )
}

export function VoteMove({removed, decision}: {removed: boolean; decision: string}) {
    return (
        <span>
            {removed ? 'Removed' : 'Voted'} <DecisionName decision={decision} />
        </span>
    )
}

export function Delta({label, value: [part, whole]}: {label: string; value: [part: bigint, whole: bigint]}) {
    const tone = part > 0n ? 'text-good' : part < 0n ? 'text-destructive' : 'text-muted-foreground'
    return (
        <div>
            <span className="text-muted-foreground">{label} </span>
            <span className={tone}>{fmtPctMove(part, whole)}</span>
        </div>
    )
}

/** What a vote put on the tally, split into the voter's own and the delegated part when anybody delegates. */
export function VoteWeight({own, delegated, change, decimals, symbol}: {own: bigint; delegated: bigint; change?: VoteChange; decimals: number; symbol: string}) {
    return (
        <>
            <Approx planck={own + delegated} decimals={decimals} symbol={symbol} />
            {delegated !== 0n && (
                <div className="text-xs text-dim">
                    <Approx planck={own} decimals={decimals} /> + <Approx planck={delegated} decimals={decimals} /> received
                </div>
            )}
            {change && <ReplacedVote change={change} decimals={decimals} />}
        </>
    )
}
