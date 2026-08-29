'use client'
import {useState} from 'react'
import AccountLink from '@/components/AccountLink'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import {sentenceCase} from '@/components/timeline'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {fmtApprox, fmtInt} from '@/lib/format'
import {identityLabel, type IdentityRef} from '@/lib/identity'

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

// both the cell and the filter call a move flat once it rounds to 0.00
const FLAT = 0.005

// radix reserves the empty item value for its placeholder, the catch-all
// entries carry their own sentinels instead
const KINDS = [
    {value: 'all', label: 'All actions'},
    {value: 'vote', label: 'Vote'},
    {value: 'remove', label: 'Remove vote'},
    {value: 'delegate', label: 'Delegate'},
    {value: 'undelegate', label: 'Undelegate'},
]

const MOVES = [
    {value: 'any', label: 'All impact'},
    {value: 'approval-up', label: 'Approval up'},
    {value: 'approval-down', label: 'Approval down'},
    {value: 'support-up', label: 'Support up'},
    {value: 'support-down', label: 'Support down'},
]

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
    const flat = Math.abs(value) < FLAT
    const tone = flat ? 'text-sub' : value > 0 ? 'text-pos' : 'text-neg'
    return (
        <div>
            <span className="text-sub">{label} </span>
            <span className={tone}>{flat ? '0.00%' : `${value > 0 ? '+' : ''}${value.toFixed(2)}%`}</span>
        </div>
    )
}

function Picker({value, options, onChange}: {value: string; options: {value: string; label: string}[]; onChange: (v: string) => void}) {
    return (
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="w-[150px]">
                <SelectValue>{options.find(o => o.value === value)?.label}</SelectValue>
            </SelectTrigger>
            <SelectContent>
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value}>
                        {o.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}

const moveHit = (i: ActionImpact | undefined, move: string) => {
    if (i == null) return false
    const v = move.startsWith('approval') ? i.approval : i.support
    if (Math.abs(v) < FLAT) return false
    return move.endsWith('up') ? v > 0 : v < 0
}

const hay = (a: ActionRow) => {
    const names = (x: ActionActor) => [x.addr, identityLabel(x.acc) ?? '']
    const parts = a.kind === 'delegate' || a.kind === 'undelegate' ? [...names(a.actor), ...names(a.by)] : names(a.actor)
    return parts.join(' ').toLowerCase()
}

export default function ActionList({rows, decimals, symbol}: {rows: ActionRow[]; decimals: number; symbol: string}) {
    const [query, setQuery] = useState('')
    const [kind, setKind] = useState('all')
    const [move, setMove] = useState('any')
    const needle = query.trim().toLowerCase()
    const shown = rows.filter(a => (kind === 'all' || a.kind === kind) && (move === 'any' || moveHit(a.impact, move)) && (needle === '' || hay(a).includes(needle)))
    return (
        <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
                <h2 className="text-[15px] font-semibold">
                    Actions <span className="font-normal text-faint">({fmtInt(shown.length)})</span>
                </h2>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                    <label className="relative">
                        <svg className="absolute top-1/2 left-3 -translate-y-1/2 text-faint" width="15" height="15" viewBox="0 0 15 15" fill="none">
                            <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                            <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Search address or identity"
                            spellCheck={false}
                            className="w-90 rounded-lg border border-edge bg-card py-1.5 pr-3 pl-9 outline-none placeholder:text-faint"
                        />
                    </label>
                    <Picker value={kind} options={KINDS} onChange={setKind} />
                    <Picker value={move} options={MOVES} onChange={setMove} />
                </div>
            </div>
            {/* the height cap would bury the table's own x scrollbar, so the
                wrapper keeps both axes */}
            <div className="max-h-120 overflow-auto">
                <table className="gtable mt-1 w-full overflow-x-visible text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(max-content,1fr)_max-content_max-content]">
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
                        {shown.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-6 text-sub">
                                    {rows.length === 0 ? 'No actions.' : 'No matching actions.'}
                                </td>
                            </tr>
                        )}
                        {shown.map(a => (
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
        </div>
    )
}
