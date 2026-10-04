'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {Jump} from '@/components/links'
import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtCompact, fmtCount, fmtInt} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'
import type {Paging} from '@/lib/paging'

export interface Delegator {
    addr: string
    acc?: IdentityRef
    conviction: string
    capital: string
    votes: string
}

export interface VoteEntry {
    id: string
    addr: string
    acc?: IdentityRef
    conviction: string
    capital: string
    selfVotes: string
    delegatorCount: number
    delegatedCapital: string
    delegatedVotes: string
    delegators: Delegator[]
}

/** A split vote, its amounts in the order of the list's labels. */
export interface SplitEntry {
    id: string
    addr: string
    acc?: IdentityRef
    amounts: string[]
}

export interface VoteGroup {
    label: string
    total: number
    href: string
    active: boolean
}

// conviction and delegations only reach the tally through a standard vote, a
// split shows the parts it was split into
export type VoteRows = {kind: 'standard'; rows: VoteEntry[]; partial: boolean} | {kind: 'split'; labels: string[]; rows: SplitEntry[]}

const LEAD = 'font-mono'
const AUX = 'font-mono text-muted-foreground'

function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t py-2 first:border-t-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    )
}

const dcol = columnsFor<Delegator>()

function Detail({v, decimals, symbol}: {v: VoteEntry; decimals: number; symbol: string}) {
    const hidden = v.delegatorCount - v.delegators.length
    const columns = useMemo(
        () => [
            dcol.display({id: 'delegator', header: 'Delegator', meta: {className: 'w-full px-0 py-2 first:pl-0'}, cell: ({row}) => <AccountLink addr={row.original.addr} acc={row.original.acc} />}),
            dcol.display({
                id: 'capital',
                header: 'Capital',
                meta: {align: 'right', className: 'py-2', cellClassName: LEAD},
                cell: ({row}) => (
                    <>
                        {fmtCompact(row.original.capital, decimals)} {symbol} <span className="text-dim">{row.original.conviction}</span>
                    </>
                ),
            }),
            dcol.display({id: 'votes', header: 'Votes', meta: {align: 'right', className: 'px-0 py-2 last:pr-0', cellClassName: AUX}, cell: ({row}) => `${fmtCompact(row.original.votes, decimals)} ${symbol}`}),
        ],
        [decimals, symbol]
    )
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 sm:grid-cols-2">
                <div>
                    <h3 className="text-[13px] font-semibold">Self votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={`${fmtCompact(v.selfVotes, decimals)} ${symbol}`} />
                        <Stat label="Conviction" value={v.conviction} />
                        <Stat label="Capital" value={`${fmtCompact(v.capital, decimals)} ${symbol}`} />
                    </div>
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold">Delegated votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={`${fmtCompact(v.delegatedVotes, decimals)} ${symbol}`} />
                        <Stat label="Delegators" value={fmtInt(v.delegatorCount)} />
                        <Stat label="Capital" value={`${fmtCompact(v.delegatedCapital, decimals)} ${symbol}`} />
                    </div>
                </div>
            </div>
            {v.delegators.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-[13px] font-semibold">Delegation list</h3>
                    <DataTable columns={columns} rows={v.delegators} getRowId={d => d.addr} className="mt-1" />
                    {hidden > 0 && (
                        <Link href={`/account/${v.addr}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                            {fmtCount(hidden, 'more delegator')} on the account page <Jump />
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

const col = columnsFor<VoteEntry>()

function StandardTable({rows, decimals, symbol, empty}: {rows: VoteEntry[]; decimals: number; symbol: string; empty: string}) {
    const columns = useMemo(
        () => [
            col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={row.original.addr} acc={row.original.acc} />}),
            col.display({
                id: 'capital',
                header: 'Capital',
                meta: {align: 'right', cellClassName: LEAD},
                cell: ({row}) => (
                    <>
                        {fmtCompact(row.original.capital, decimals)} {symbol} <span className="text-dim">{row.original.conviction}</span>
                    </>
                ),
            }),
            col.display({id: 'votes', header: 'Votes', meta: {align: 'right', cellClassName: AUX}, cell: ({row}) => `${fmtCompact(row.original.selfVotes, decimals)} ${symbol}`}),
            col.display({
                id: 'delegated',
                header: 'Delegated',
                meta: {align: 'right', cellClassName: AUX},
                cell: ({row}) =>
                    row.original.delegatorCount > 0 ? (
                        <>
                            {fmtCompact(row.original.delegatedVotes, decimals)} {symbol} <span className="text-dim">({fmtInt(row.original.delegatorCount)})</span>
                        </>
                    ) : (
                        NONE
                    ),
            }),
            expander(col),
        ],
        [decimals, symbol]
    )
    return <DataTable columns={columns} rows={rows} empty={empty} getRowId={v => v.id} canExpand={() => true} expand={v => <Detail v={v} decimals={decimals} symbol={symbol} />} />
}

const scol = columnsFor<SplitEntry>()

function SplitTable({labels, rows, decimals, symbol, empty}: {labels: string[]; rows: SplitEntry[]; decimals: number; symbol: string; empty: string}) {
    const columns = useMemo(
        () => [
            scol.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={row.original.addr} acc={row.original.acc} />}),
            ...labels.map((label, i) =>
                scol.display({
                    id: label,
                    header: label,
                    meta: {align: 'right', cellClassName: i === 0 ? LEAD : AUX},
                    cell: ({row}) => `${fmtCompact(row.original.amounts[i], decimals)} ${symbol}`,
                })
            ),
        ],
        [labels, decimals, symbol]
    )
    return <DataTable columns={columns} rows={rows} empty={empty} getRowId={v => v.id} />
}

export default function VoteLists({groups, list, paging, decimals, symbol}: {groups: VoteGroup[]; list: VoteRows; paging: Paging; decimals: number; symbol: string}) {
    const group = groups.find(g => g.active)!
    const empty = `No ${group.label.toLowerCase()} votes.`
    return (
        <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                {groups.map(g => (
                    <FilterChip key={g.label} label={g.label} count={g.total} href={g.href} active={g.active} />
                ))}
            </div>
            <Card size="flush">
                {list.kind === 'standard' ? (
                    <StandardTable rows={list.rows} decimals={decimals} symbol={symbol} empty={empty} />
                ) : (
                    <SplitTable labels={list.labels} rows={list.rows} decimals={decimals} symbol={symbol} empty={empty} />
                )}
            </Card>
            <Pager paging={paging} total={group.total} href={group.href} />
            {list.kind === 'standard' && list.partial && <p className="mt-2 text-xs text-warn">this track has more delegations than one page can hold, delegated figures are partial</p>}
        </div>
    )
}
