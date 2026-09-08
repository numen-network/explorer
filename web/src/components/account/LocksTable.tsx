'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {NONE} from '@/components/Detail'

export interface LockCell {
    kind: 'Frozen' | 'Reserved'
    source: string
    amount: string
    until: number | null
    freedBy?: string
    unattributed?: true
}

const col = columnsFor<LockCell>()

export function LocksTable({rows, chain}: {rows: LockCell[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'kind', header: 'Kind', cell: ({row}) => <Badge variant={row.original.kind === 'Frozen' ? 'primary' : 'idle'}>{row.original.kind}</Badge>}),
                col.display({id: 'source', header: 'Source', cell: ({row}) => row.original.source}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                col.display({
                    id: 'unlocks',
                    header: 'Unlocks',
                    meta: {className: 'w-full', cellClassName: 'text-muted-foreground'},
                    cell: ({row}) =>
                        row.original.until != null ? (
                            <>
                                until <BlockLink height={row.original.until} />
                            </>
                        ) : row.original.freedBy ? (
                            row.original.freedBy
                        ) : row.original.unattributed ? (
                            <span className="text-dim">the chain records no reason for a plain reserve</span>
                        ) : (
                            NONE
                        ),
                }),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={r => `${r.kind}-${r.source}`} />
}
