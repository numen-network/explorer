import AccountLink from '@/components/AccountLink'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import {sentenceCase} from '@/components/timeline'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'

export interface ActionActor {
    addr: string
    acc?: IdentityRef
}

export type ActionRow =
    | {id: string; block: number; iso?: string; actor: ActionActor; amount: string; own: string; delegated: string; kind: 'vote' | 'remove'; decision: string}
    | {id: string; block: number; iso?: string; actor: ActionActor; amount: string; own: string; delegated: string; kind: 'delegate' | 'undelegate'; by: ActionActor}

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
                <span className="flex items-center gap-1.5">
                    {a.kind === 'delegate' ? 'Delegated by' : 'Undelegated by'}
                    <AccountLink addr={a.by.addr} acc={a.by.acc} />
                </span>
            )
    }
}

export default function ActionList({rows, decimals, symbol}: {rows: ActionRow[]; decimals: number; symbol: string}) {
    return (
        <div className="card overflow-x-auto">
            <h2 className="px-5 pt-4 text-[15px] font-semibold">
                Actions <span className="font-normal text-faint">({fmtInt(rows.length)})</span>
            </h2>
            <table className="gtable mt-1 w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_minmax(16ch,1fr)_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Block</th>
                        <th>
                            <TimeModeButton />
                        </th>
                        <th>Account</th>
                        <th>Action</th>
                        <th className="text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={5} className="py-6 text-sub">
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
                                {fmtBalance(a.amount, decimals, symbol)}
                                {a.delegated !== '0' && (
                                    <div className="text-xs text-faint">
                                        {fmtBalance(a.own, decimals)} + {fmtBalance(a.delegated, decimals)} delegated
                                    </div>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
