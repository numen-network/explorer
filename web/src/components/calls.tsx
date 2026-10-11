import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {fmtInt} from '@/lib/format'
import type {CallCount, CallRef} from '@/lib/gql'

export const qualified = (c: CallRef) => `${c.pallet}.${c.method}`

/** What a transfer really called, which a batch or a proxy hides from the extrinsic. */
export function CallPill({call}: {call: CallRef | null}) {
    if (!call) return <span className="text-[11px] text-dim">—</span>
    return (
        <Tip text={qualified(call)}>
            <Badge variant="primary" className="min-w-0 shrink truncate font-mono">
                {call.method}
            </Badge>
        </Tip>
    )
}

const SEP = ' · '

// how many characters of the inner line a row can hold
const LINE = 46

// a repeated name shows once with its count, which is what a batch of payouts is
export const counted = (name: string, count: number) => (count > 1 ? `${fmtInt(count)}× ${name}` : name)

// a wide batch names more calls than the row can hold, so the line keeps whole
// entries and counts the rest
function fit(parts: string[]): string {
    const line = (kept: number) => (kept < parts.length ? [...parts.slice(0, kept), `+${fmtInt(parts.length - kept)} more`] : parts).join(SEP)
    let kept = parts.length
    while (kept > 1 && line(kept).length > LINE) kept--
    return line(kept)
}

/** A list row for a call, with what it ran underneath when it wraps anything. */
export function CallCell({call, leaves}: {call: CallRef; leaves: CallCount[] | null}) {
    const parts = leaves?.map(c => counted(qualified(c), c.count))
    return (
        <div className="font-mono text-[13px]">
            <div>{qualified(call)}</div>
            {parts && (
                <Tip text={parts.join(SEP)}>
                    <div className="mt-0.5 text-[11px] text-dim">{fit(parts)}</div>
                </Tip>
            )}
        </div>
    )
}
