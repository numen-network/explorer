'use client'

import Link from 'next/link'
import {useMemo, useState} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {Jump} from '@/components/links'
import {Card} from '@/components/ui/card'
import {Tabs, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {fmtCompact, fmtInt} from '@/lib/format'

const CHIP =
    'group/chip h-auto flex-none gap-1 rounded-full border-border bg-card px-3 py-1 text-xs font-normal text-muted-foreground hover:text-foreground data-active:border-primary data-active:bg-primary data-active:font-medium data-active:text-primary-foreground data-active:shadow-none!'
import type {IdentityRef} from '@/lib/identity'

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

function Stat({label, value}: {label: string; value: string}) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t py-2 first:border-t-0">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-mono">{value}</span>
        </div>
    )
}

const dcol = columnsFor<Delegator>()

function Detail({v, symbol}: {v: VoteEntry; symbol: string}) {
    const hidden = v.delegatorCount - v.delegators.length
    const columns = useMemo(
        () => [
            dcol.display({id: 'delegator', header: 'Delegator', meta: {className: 'w-full px-0 py-2 first:pl-0'}, cell: ({row}) => <AccountLink addr={row.original.addr} acc={row.original.acc} />}),
            dcol.display({
                id: 'capital',
                header: 'Capital',
                meta: {align: 'right', className: 'py-2', cellClassName: 'font-mono'},
                cell: ({row}) => (
                    <>
                        {fmtCompact(row.original.capital)} {symbol} <span className="text-dim">{row.original.conviction}</span>
                    </>
                ),
            }),
            dcol.display({id: 'votes', header: 'Votes', meta: {align: 'right', className: 'px-0 py-2 last:pr-0', cellClassName: 'font-mono'}, cell: ({row}) => `${fmtCompact(row.original.votes)} ${symbol}`}),
        ],
        [symbol]
    )
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
                    <DataTable columns={columns} rows={v.delegators} getRowId={d => d.addr} className="mt-1" />
                    {hidden > 0 && (
                        <Link href={`/account/${v.addr}`} className="mt-2 inline-block text-xs text-primary hover:underline">
                            {fmtInt(hidden)} more {hidden === 1 ? 'delegator' : 'delegators'} on the account page <Jump />
                        </Link>
                    )}
                </div>
            )}
        </div>
    )
}

const col = columnsFor<VoteEntry>()

export default function VoteLists({groups, symbol, partial}: {groups: VoteGroup[]; symbol: string; partial: boolean}) {
    const [at, setAt] = useState(Math.max(0, groups.findIndex(g => g.total > 0)))
    const group = groups[Math.min(at, groups.length - 1)]
    const columns = useMemo(
        () => [
            col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={row.original.addr} acc={row.original.acc} />}),
            col.display({id: 'delegators', header: 'Delegators', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.delegatorCount)}),
            col.display({id: 'votes', header: 'Votes', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => `${fmtCompact(row.original.selfVotes + row.original.delegatedVotes)} ${symbol}`}),
            expander(col),
        ],
        [symbol]
    )
    return (
        <div>
            <Tabs value={String(at)} onValueChange={v => setAt(Number(v))} className="mb-3">
                <TabsList className="h-auto flex-wrap justify-start gap-2 rounded-none bg-transparent p-0 group-data-horizontal/tabs:h-auto">
                    {groups.map((g, i) => (
                        <TabsTrigger key={g.label} value={String(i)} className={CHIP}>
                            {g.label} <span className="text-dim group-data-active/chip:text-primary-foreground/70">{fmtInt(g.total)}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>
            </Tabs>
            <Card size="flush">
                <DataTable columns={columns} rows={group.rows} empty={`No ${group.label.toLowerCase()} votes.`} getRowId={v => v.id} canExpand={() => true} expand={v => <Detail v={v} symbol={symbol} />} />
            </Card>
            {group.rows.length < group.total && (
                <p className="mt-2 text-xs text-dim">
                    showing the largest {fmtInt(group.rows.length)} of {fmtInt(group.total)} votes
                </p>
            )}
            {partial && <p className="mt-2 text-xs text-warn">this track has more delegations than one page can hold, delegated figures are partial</p>}
        </div>
    )
}
