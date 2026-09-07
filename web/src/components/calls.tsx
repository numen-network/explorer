import AccountLink from '@/components/AccountLink'
import {JsonBlock} from '@/components/Detail'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import type {ChainProps} from '@/lib/chain'
import type {AccountRef, CallRef, CallRow, EventRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const qualified = (c: CallRef) => `${c.pallet}.${c.method}`

/** What a transfer really called, which a batch or a proxy hides from the extrinsic. */
export function CallPill({call}: {call: CallRef | null}) {
    if (!call) return <span className="text-[11px] text-dim">—</span>
    return (
        <Tip text={qualified(call)}>
            <Badge variant="primary" className="font-mono">
                {call.method}
            </Badge>
        </Tip>
    )
}

const SEP = ' · '

// how many characters of the inner line a row can hold
const LINE = 46

// identical calls collapse into a count, which is what a batch of payouts is
function tally(leaves: CallRef[]): string[] {
    const n = new Map<string, number>()
    for (const c of leaves) n.set(qualified(c), (n.get(qualified(c)) ?? 0) + 1)
    return [...n].map(([name, count]) => (count > 1 ? `${count}× ${name}` : name))
}

// a wide batch names more calls than the row can hold, so the line keeps whole
// entries and counts the rest
function fit(parts: string[]): string {
    const line = (kept: number) => (kept < parts.length ? [...parts.slice(0, kept), `+${parts.length - kept} more`] : parts).join(SEP)
    let kept = parts.length
    while (kept > 1 && line(kept).length > LINE) kept--
    return line(kept)
}

/** A list row for a call, with what it ran underneath when it wraps anything. */
export function CallCell({call, leaves}: {call: CallRef; leaves?: CallRef[]}) {
    const parts = leaves && leaves.length > 0 ? tally(leaves) : []
    return (
        <div className="font-mono text-[13px]">
            <div>{qualified(call)}</div>
            {parts.length > 0 && (
                <Tip text={parts.join(SEP)}>
                    <div className="mt-0.5 text-[11px] text-dim">{fit(parts)}</div>
                </Tip>
            )}
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
        <Card size="flush" className="divide-y">
            {calls.length === 0 && <div className="px-5 py-5 text-sm text-muted-foreground">None</div>}
            {[...calls].sort(preorder).map(c => {
                const raised = byCall.get(c.id) ?? []
                const dispatched = c.origin && c.origin.id !== signer?.id ? c.origin : null
                return (
                    <Collapsible key={c.id} defaultOpen={c.address.length === 0} className="group py-2.5 pr-5">
                        <CollapsibleTrigger className="flex w-full cursor-pointer items-center gap-3 text-left text-sm" style={{paddingLeft: `${20 + c.address.length * 22}px`}}>
                            <span className="font-mono text-[13px]">{qualified(c)}</span>
                            {!c.success && <Badge variant="neg">Failed</Badge>}
                            {raised.length > 0 && <span className="text-[11px] text-dim">{raised.length} events</span>}
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2 space-y-2" style={{paddingLeft: `${36 + c.address.length * 22}px`}}>
                            {dispatched && (
                                <div className="flex gap-3 text-sm">
                                    <span className="text-muted-foreground">Dispatched as</span>
                                    <AccountLink full addr={ss58Encode(dispatched.id, chain.ss58)} acc={dispatched} />
                                </div>
                            )}
                            <JsonBlock value={c.args} />
                            {raised.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {raised.map(e => (
                                        <Badge key={e.id} variant="outline" className="bg-background font-mono text-muted-foreground">
                                            {e.pallet}.{e.method}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CollapsibleContent>
                    </Collapsible>
                )
            })}
        </Card>
    )
}
