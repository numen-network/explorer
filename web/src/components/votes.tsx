'use client'

import Link from 'next/link'
import {Fragment, useState} from 'react'
import AccountLink from '@/components/AccountLink'
import {fmtCompact, fmtInt} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'
import {Jump} from '@/components/links'

export interface Delegator {
    addr: string
    acc?: IdentityRef
    conviction: string
    capital: number
    votes: number
}

export interface VoteEntry {
    id: string
    addr: string
    acc?: IdentityRef
    conviction: string | null
    capital: number
    selfVotes: number
    delegatorCount: number
    delegatedCapital: number
    delegatedVotes: number
    delegators: Delegator[]
}

export interface VoteGroup {
    label: string
    total: number
    rows: VoteEntry[]
}

const COLS = 'grid-cols-[minmax(16ch,1fr)_max-content_max-content_2.5rem]'

function Caret({open}: {open: boolean}) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" className={`transition-transform ${open ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 3.5 10.5 8 6 12.5" />
        </svg>
    )
}

function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t border-edge py-2 first:border-t-0">
            <span className="text-sub">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    )
}

function Detail({v, symbol}: {v: VoteEntry; symbol: string}) {
    const hidden = v.delegatorCount - v.delegators.length
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 sm:grid-cols-2">
                <div>
                    <h3 className="text-[13px] font-semibold">Self votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={`${fmtCompact(v.selfVotes)} ${symbol}`} />
                        <Stat label="Conviction" value={v.conviction ?? '—'} />
                        <Stat label="Capital" value={`${fmtCompact(v.capital)} ${symbol}`} />
                    </div>
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold">Delegated votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={`${fmtCompact(v.delegatedVotes)} ${symbol}`} />
                        <Stat label="Delegators" value={fmtInt(v.delegatorCount)} />
                        <Stat label="Capital" value={`${fmtCompact(v.delegatedCapital)} ${symbol}`} />
                    </div>
                </div>
            </div>
            {v.delegators.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-[13px] font-semibold">Delegation list</h3>
                    <table className="gtable mt-1 w-full text-sm whitespace-nowrap grid-cols-[minmax(16ch,1fr)_max-content_max-content]">
                        <thead>
                            <tr>
                                <th className="px-0 py-2">Delegator</th>
                                <th className="py-2 text-right">Capital</th>
                                <th className="px-0 py-2 text-right">Votes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {v.delegators.map(d => (
                                <tr key={d.addr}>
                                    <td className="px-0 py-2">
                                        <AccountLink addr={d.addr} acc={d.acc} />
                                    </td>
                                    <td className="py-2 text-right font-mono">
                                        {fmtCompact(d.capital)} {symbol} <span className="text-faint">{d.conviction}</span>
                                    </td>
                                    <td className="px-0 py-2 text-right font-mono">
                                        {fmtCompact(d.votes)} {symbol}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hidden > 0 && (
                        <Link href={`/account/${v.addr}`} className="mt-2 inline-block text-xs text-accent hover:underline">
                            {fmtInt(hidden)} more {hidden === 1 ? 'delegator' : 'delegators'} on the account page <Jump />
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

export default function VoteLists({groups, symbol, partial}: {groups: VoteGroup[]; symbol: string; partial: boolean}) {
    const [at, setAt] = useState(Math.max(0, groups.findIndex(g => g.total > 0)))
    const [open, setOpen] = useState<string | null>(null)
    const group = groups[Math.min(at, groups.length - 1)]
    return (
        <div>
            <div className="mb-3 flex flex-wrap gap-2">
                {groups.map((g, i) => (
                    <button
                        key={g.label}
                        onClick={() => {
                            setAt(i)
                            setOpen(null)
                        }}
                        className={`rounded-full border px-3 py-1 text-xs whitespace-nowrap ${i === at ? 'border-accent bg-accent font-medium text-white' : 'border-edge bg-card text-sub hover:text-ink'}`}
                    >
                        {g.label} <span className={i === at ? 'text-white/70' : 'text-faint'}>{fmtInt(g.total)}</span>
                    </button>
                ))}
            </div>
            <div className="card overflow-x-auto">
                <table className={`gtable w-full text-sm whitespace-nowrap ${COLS}`}>
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th className="text-right">Delegators</th>
                            <th className="text-right">Votes</th>
                            <th className="px-0" />
                        </tr>
                    </thead>
                    <tbody>
                        {group.rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-6 text-sub">
                                    No {group.label.toLowerCase()} votes.
                                </td>
                            </tr>
                        )}
                        {group.rows.map(v => (
                            <Fragment key={v.id}>
                                <tr className="cursor-pointer" onClick={() => setOpen(open === v.id ? null : v.id)}>
                                    <td>
                                        <AccountLink addr={v.addr} acc={v.acc} />
                                    </td>
                                    <td className="text-right font-mono">{fmtInt(v.delegatorCount)}</td>
                                    <td className="text-right font-mono">
                                        {fmtCompact(v.selfVotes + v.delegatedVotes)} {symbol}
                                    </td>
                                    <td className="px-0 text-faint">
                                        <Caret open={open === v.id} />
                                    </td>
                                </tr>
                                {open === v.id && (
                                    <tr>
                                        <td colSpan={4}>
                                            <Detail v={v} symbol={symbol} />
                                        </td>
                                    </tr>
                                )}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
            {group.rows.length < group.total && (
                <p className="mt-2 text-xs text-faint">
                    showing the largest {fmtInt(group.rows.length)} of {fmtInt(group.total)} votes
                </p>
            )}
            {partial && <p className="mt-2 text-xs text-warn">this track has more delegations than one page can hold, delegated figures are partial</p>}
        </div>
    )
}
