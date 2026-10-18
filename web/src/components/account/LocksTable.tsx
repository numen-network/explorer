'use client'

import {useMemo} from 'react'
import Link from 'next/link'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {NONE} from '@/components/Detail'

export interface LockCell {
    kind: 'Frozen' | 'Reserved'
    source: string
    href?: string
    amount: string
    until: number | null
    freedBy?: string
    refund?: 'now' | 'never'
    unattributed?: true
}

const col = columnsFor<LockCell>()

function Unlocks({row}: {row: LockCell}) {
    if (row.until != null) {
        return (
            <>
                until <BlockLink height={row.until} />
            </>
        )
    }
    if (row.refund === 'now') return <Badge variant="pos">Refundable now</Badge>
    if (row.refund === 'never') return <Badge variant="neg">Never refunded</Badge>
    if (row.freedBy) return row.freedBy
    if (row.unattributed) return <span className="text-dim">the chain records no reason for a plain reserve</span>
    return NONE
}

export function LocksTable({rows, chain}: {rows: LockCell[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'kind', header: 'Kind', cell: ({row}) => <Badge variant={row.original.kind === 'Frozen' ? 'primary' : 'idle'}>{row.original.kind}</Badge>}),
                col.display({
                    id: 'source',
                    header: 'Source',
                    cell: ({row}) =>
                        row.original.href ? (
                            <Link href={row.original.href} className="hover:underline">
                                {row.original.source}
                            </Link>
                        ) : (
                            row.original.source
                        ),
                }),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                col.display({id: 'unlocks', header: 'Unlocks', meta: {className: 'w-full', cellClassName: 'text-muted-foreground'}, cell: ({row}) => <Unlocks row={row.original} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={r => `${r.kind}-${r.source}`} />
}
