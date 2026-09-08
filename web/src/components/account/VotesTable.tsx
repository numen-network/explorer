'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {unlockAt} from '@/lib/conviction'
import {fmtBalance} from '@/lib/format'
import type {VoteRow} from '@/lib/gql'
import {NONE} from '@/components/Detail'

const col = columnsFor<VoteRow>()

export function VotesTable({rows, chain}: {rows: VoteRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'referendum',
                    header: 'Referendum', meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <span className={row.original.removed ? 'opacity-50' : undefined}>
                            <Link href={`/referendum/${row.original.referendum.index}`} className="font-mono text-primary hover:underline">
                                #{row.original.referendum.index}
                            </Link>
                            {row.original.removed && <span className="ml-2 text-[11px] text-dim">removed</span>}
                        </span>
                    ),
                }),
                col.display({
                    id: 'vote',
                    header: 'Vote',
                    cell: ({row}) => <Badge variant={row.original.decision === 'aye' ? 'pos' : row.original.decision === 'nay' ? 'neg' : 'idle'}>{row.original.decision}</Badge>,
                }),
                col.display({id: 'conviction', header: 'Conviction', meta: {cellClassName: 'font-mono'}, cell: ({row}) => row.original.conviction ?? '—'}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({
                    id: 'unlocks',
                    header: 'Unlocks',
                    meta: {cellClassName: 'text-muted-foreground'},
                    cell: ({row}) => {
                        const free = unlockAt(row.original, row.original.referendum, chain.voteLockingPeriod)
                        return free != null ? <BlockLink height={free} /> : NONE
                    },
                }),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={v => v.id} />
}
