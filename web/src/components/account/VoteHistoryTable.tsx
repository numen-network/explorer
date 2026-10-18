'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {VoteMove, VoteWeight} from '@/components/actions'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {capitalOf, convictionLabel, decisionOf, levelLabel, votesOf} from '@/lib/conviction'
import {fmtBalance} from '@/lib/format'
import type {VoteHistoryRow} from '@/lib/gql'

const col = columnsFor<VoteHistoryRow>()

export function VoteHistoryTable({rows, chain}: {rows: VoteHistoryRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'referendum',
                    header: 'Referendum',
                    cell: ({row}) => (
                        <Link href={`/referendum/${row.original.referendum.index}`} className="font-mono text-primary hover:underline">
                            #{row.original.referendum.index}
                        </Link>
                    ),
                }),
                col.display({id: 'action', header: 'Action', meta: {className: 'w-full'}, cell: ({row}) => <VoteMove removed={row.original.method === 'VoteRemoved'} decision={decisionOf(row.original)} />}),
                col.display({id: 'conviction', header: 'Conviction', meta: {cellClassName: 'font-mono'}, cell: ({row}) => (row.original.kind === 'Standard' ? convictionLabel(row.original.conviction) : levelLabel(0))}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(capitalOf(row.original), chain.decimals, chain.symbol)}),
                col.display({
                    id: 'votes',
                    header: 'Votes',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => <VoteWeight own={votesOf(row.original)} delegated={BigInt(row.original.delegatedVotes)} decimals={chain.decimals} symbol={chain.symbol} />,
                }),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={a => a.id} />
}
