import Approx from '@/components/Approx'
import {fmtPctMove, sentenceCase} from '@/lib/format'

const TONE: Record<string, string> = {aye: 'text-good', nay: 'text-destructive'}

export function VoteMove({removed, decision}: {removed: boolean; decision: string}) {
    return (
        <span>
            {removed ? 'Removed' : 'Voted'} <span className={TONE[decision] ?? 'text-muted-foreground'}>{sentenceCase(decision)}</span>
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
export function VoteWeight({own, delegated, decimals, symbol}: {own: bigint; delegated: bigint; decimals: number; symbol: string}) {
    return (
        <>
            <Approx planck={own + delegated} decimals={decimals} symbol={symbol} />
            {delegated !== 0n && (
                <div className="text-xs text-dim">
                    <Approx planck={own} decimals={decimals} /> + <Approx planck={delegated} decimals={decimals} /> delegated
                </div>
            )}
        </>
    )
}
