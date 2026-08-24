import AccountLink from '@/components/AccountLink'
import {JsonBlock} from '@/components/Detail'
import {Tag} from '@/components/pills'
import type {ChainProps} from '@/lib/chain'
import type {AccountRef, CallRef, CallRow, EventRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const qualified = (c: CallRef) => `${c.pallet}.${c.method}`

/** What a transfer really called, which a batch or a proxy hides from the extrinsic. */
export function CallPill({call}: {call: CallRef | null}) {
    if (!call) return <span className="text-[11px] text-faint">—</span>
    return (
        <span className="rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] whitespace-nowrap text-accent" title={qualified(call)}>
            {call.method}
        </span>
    )
}

// identical calls collapse into a count, which is what a batch of payouts is
function tally(leaves: CallRef[]): string {
    const n = new Map<string, number>()
    for (const c of leaves) n.set(qualified(c), (n.get(qualified(c)) ?? 0) + 1)
    return [...n].map(([name, count]) => (count > 1 ? `${count}× ${name}` : name)).join(' · ')
}

/** A list row for a call, with what it ran underneath when it wraps anything. */
export function CallCell({call, leaves}: {call: CallRef; leaves?: CallRef[]}) {
    const inner = leaves && leaves.length > 0 ? tally(leaves) : ''
    return (
        <div className="font-mono text-[13px]">
            <div>{qualified(call)}</div>
            {inner && <div className="mt-0.5 max-w-[46ch] truncate text-[11px] text-faint" title={inner}>{inner}</div>}
        </div>
    )
}

// address is the path down from the root, so sorting by it yields preorder and
// its length is the indent. that leaves nothing to assemble
const preorder = (a: CallRow, b: CallRow) => {
    const n = Math.min(a.address.length, b.address.length)
    for (let i = 0; i < n; i++) if (a.address[i] !== b.address[i]) return a.address[i] - b.address[i]
    return a.address.length - b.address.length
}

export function CallTree({calls, events, chain, signer}: {calls: CallRow[]; events: EventRow[]; chain: ChainProps; signer: AccountRef | null}) {
    const byCall = new Map<string, EventRow[]>()
    for (const e of events) {
        if (e.call == null) continue
        const arr = byCall.get(e.call.id) ?? []
        arr.push(e)
        byCall.set(e.call.id, arr)
    }
    return (
        <div className="card divide-y divide-edge">
            {calls.length === 0 && <div className="px-5 py-5 text-sm text-sub">None</div>}
            {[...calls].sort(preorder).map(c => {
                const raised = byCall.get(c.id) ?? []
                const dispatched = c.origin && c.origin.id !== signer?.id ? c.origin : null
                return (
                    <details key={c.id} open={c.address.length === 0} className="py-2.5 pr-5">
                        <summary className="flex cursor-pointer items-center gap-3 text-sm" style={{paddingLeft: `${20 + c.address.length * 22}px`}}>
                            <span className="font-mono text-[13px]">{qualified(c)}</span>
                            {!c.success && <Tag text="Failed" tone="neg" />}
                            {raised.length > 0 && <span className="text-[11px] text-faint">{raised.length} events</span>}
                        </summary>
                        <div className="mt-2 space-y-2" style={{paddingLeft: `${36 + c.address.length * 22}px`}}>
                            {dispatched && (
                                <div className="flex gap-3 text-sm">
                                    <span className="text-sub">Dispatched as</span>
                                    <AccountLink full addr={ss58Encode(dispatched.id, chain.ss58)} acc={dispatched} />
                                </div>
                            )}
                            <JsonBlock value={c.args} />
                            {raised.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {raised.map(e => (
                                        <span key={e.id} className="rounded-md border border-edge bg-bg px-1.5 py-0.5 font-mono text-[11px] text-sub">
                                            {e.pallet}.{e.method}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </details>
                )
            })}
        </div>
    )
}
