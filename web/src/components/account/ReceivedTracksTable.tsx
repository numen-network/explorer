'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'

export interface ReceivedTrackRow {
    id: string
    name: string
    delegators: number
    capital: string
    votes: string
    /** Where the track link goes, the filter on this track or, when it is the one picked, back to all. */
    href: string
    picked: boolean
}

const col = columnsFor<ReceivedTrackRow>()

export function ReceivedTracksTable({rows, chain}: {rows: ReceivedTrackRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'track',
                    header: 'Track',
                    meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <Link href={row.original.href} aria-current={row.original.picked ? 'page' : undefined} scroll={false} className="text-primary hover:underline">
                            {row.original.name}
                        </Link>
                    ),
                }),
                col.display({id: 'delegators', header: 'Delegators', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.delegators)}),
                col.display({id: 'capital', header: 'Capital', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.capital, chain.decimals, chain.symbol)}),
                col.display({id: 'votes', header: 'Votes', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.votes, chain.decimals, chain.symbol)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={r => r.id} className="[&_tr:has([aria-current=page])]:bg-muted" />
}
