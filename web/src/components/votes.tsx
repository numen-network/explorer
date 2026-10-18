'use client'

import Link from 'next/link'
import {useMemo, type ReactNode} from 'react'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {Jump} from '@/components/links'
import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtCount, fmtInt} from '@/lib/format'
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
export type VoteRows = {kind: 'standard'; rows: VoteEntry[]} | {kind: 'split'; labels: string[]; rows: SplitEntry[]}

const LEAD = 'font-mono'
const AUX = 'font-mono text-muted-foreground'

function Stat({label, value}: {label: string; value: ReactNode}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t py-2 first:border-t-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    )
}

const dcol = columnsFor<Delegator>()

/** What a standard vote brings to the tally, its own part and every delegation it carries, moreHref holding the delegators past the inline few. */
export function VoteDetail({v, moreHref, decimals, symbol}: {v: VoteEntry; moreHref: string; decimals: number; symbol: string}) {
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
                        <Approx planck={row.original.capital} decimals={decimals} symbol={symbol} /> <span className="text-dim">{row.original.conviction}</span>
                    </>
                ),
            }),
            dcol.display({id: 'votes', header: 'Votes', meta: {align: 'right', className: 'px-0 py-2 last:pr-0', cellClassName: AUX}, cell: ({row}) => <Approx planck={row.original.votes} decimals={decimals} symbol={symbol} />}),
        ],
        [decimals, symbol]
    )
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 sm:grid-cols-2">
                <div>
                    <h3 className="text-[13px] font-semibold">Self votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={<Approx planck={v.selfVotes} decimals={decimals} symbol={symbol} />} />
                        <Stat label="Conviction" value={v.conviction} />
                        <Stat label="Capital" value={<Approx planck={v.capital} decimals={decimals} symbol={symbol} />} />
                    </div>
                </div>
                <div>
                    <h3 className="text-[13px] font-semibold">Delegated votes</h3>
                    <div className="mt-1 text-sm">
                        <Stat label="Votes" value={<Approx planck={v.delegatedVotes} decimals={decimals} symbol={symbol} />} />
                        <Stat label="Delegators" value={fmtInt(v.delegatorCount)} />
                        <Stat label="Capital" value={<Approx planck={v.delegatedCapital} decimals={decimals} symbol={symbol} />} />
                    </div>
                </div>
            </div>
            {v.delegators.length > 0 && (
                <div className="mt-5">
                    <h3 className="text-[13px] font-semibold">Delegation list</h3>
                    <DataTable columns={columns} rows={v.delegators} getRowId={d => d.addr} className="mt-1" />
                    {hidden > 0 && (
                        <Link href={moreHref} className="mt-2 inline-block text-xs text-primary hover:underline">
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
                        <Approx planck={row.original.capital} decimals={decimals} symbol={symbol} /> <span className="text-dim">{row.original.conviction}</span>
                    </>
                ),
            }),
            col.display({id: 'votes', header: 'Votes', meta: {align: 'right', cellClassName: AUX}, cell: ({row}) => <Approx planck={row.original.selfVotes} decimals={decimals} symbol={symbol} />}),
            col.display({
                id: 'delegated',
                header: 'Delegated',
                meta: {align: 'right', cellClassName: AUX},
                cell: ({row}) =>
                    row.original.delegatorCount > 0 ? (
                        <>
                            <Approx planck={row.original.delegatedVotes} decimals={decimals} symbol={symbol} /> <span className="text-dim">({fmtInt(row.original.delegatorCount)})</span>
                        </>
                    ) : (
                        NONE
                    ),
            }),
            expander(col),
        ],
        [decimals, symbol]
    )
    return <DataTable columns={columns} rows={rows} empty={empty} getRowId={v => v.id} canExpand={() => true} expand={v => <VoteDetail v={v} moreHref={`/account/${v.addr}`} decimals={decimals} symbol={symbol} />} />
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
                    cell: ({row}) => <Approx planck={row.original.amounts[i]} decimals={decimals} symbol={symbol} />,
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
        </div>
    )
}
