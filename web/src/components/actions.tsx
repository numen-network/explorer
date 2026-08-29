import AccountLink from '@/components/AccountLink'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import {sentenceCase} from '@/components/timeline'
import {fmtApprox, fmtInt} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'

export interface ActionActor {
    addr: string
    acc?: IdentityRef
}

export interface ActionImpact {
    approval: number
    support: number
}

export type ActionRow =
    | {id: string; block: number; iso?: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'vote' | 'remove'; decision: string}
    | {id: string; block: number; iso?: string; actor: ActionActor; amount: string; own: string; delegated: string; impact?: ActionImpact; kind: 'delegate' | 'undelegate'; by: ActionActor}

const TONE: Record<string, string> = {aye: 'text-pos', nay: 'text-neg'}

// branches by switch because typescript 7.0 fails to narrow the negation of
// an or-combined discriminant guard
function Action({a}: {a: ActionRow}) {
    switch (a.kind) {
        case 'vote':
        case 'remove':
            return (
                <span>
                    {a.kind === 'vote' ? 'Voted' : 'Removed'} <span className={TONE[a.decision] ?? 'text-sub'}>{sentenceCase(a.decision)}</span>
                </span>
            )
        default:
            return (
                <span className="block">
                    {a.kind === 'delegate' ? 'Delegated by' : 'Undelegated by'}
                    <AccountLink addr={a.by.addr} acc={a.by.acc} />
                </span>
            )
    }
}

function Delta({label, value}: {label: string; value: number}) {
    const flat = Math.abs(value) < 0.005
    const tone = flat ? 'text-sub' : value > 0 ? 'text-pos' : 'text-neg'
    return (
        <div>
            <span className="text-sub">{label} </span>
            <span className={tone}>{flat ? '0.00%' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}</span>
        </div>
    )
}

export default function ActionList({rows, decimals, symbol}: {rows: ActionRow[]; decimals: number; symbol: string}) {
    return (
        <div className="card overflow-x-auto">
            <h2 className="px-5 pt-4 text-[15px] font-semibold">
                Actions <span className="font-normal text-faint">({fmtInt(rows.length)})</span>
            </h2>
            <table className="gtable mt-1 w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_minmax(16ch,max-content)_minmax(max-content,1fr)_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Block</th>
                        <th>
                            <TimeModeButton />
                        </th>
                        <th>Account</th>
                        <th>Action</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Impact</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-6 text-sub">
                                No actions.
                            </td>
                        </tr>
                    )}
                    {rows.map(a => (
                        <tr key={a.id}>
                            <td>
                                <BlockLink height={a.block} />
                            </td>
                            <td>{a.iso ? <TimeCell iso={a.iso} /> : '—'}</td>
                            <td>
                                <AccountLink addr={a.actor.addr} acc={a.actor.acc} />
                            </td>
                            <td>
                                <Action a={a} />
                            </td>
                            <td className="text-right font-mono">
                                {fmtApprox(a.amount, decimals, symbol)}
                                {a.delegated !== '0' && (
                                    <div className="text-xs text-faint">
                                        {fmtApprox(a.own, decimals)} + {fmtApprox(a.delegated, decimals)} delegated
                                    </div>
                                )}
                            </td>
                            <td className="text-right font-mono text-xs">
                                {a.impact ? (
                                    <>
                                        <Delta label="Approval" value={a.impact.approval} />
                                        <Delta label="Support" value={a.impact.support} />
                                    </>
                                ) : (
                                    <span className="text-faint">—</span>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
