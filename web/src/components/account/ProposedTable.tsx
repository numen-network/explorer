'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {emptyText} from '@/components/EmptyList'
import {Lines} from '@/components/Lines'
import {BlockLink} from '@/components/links'
import {StatusTag} from '@/components/referenda'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, trackLabel} from '@/lib/format'
import type {ProposedRow} from '@/lib/gql'
import {phaseOf} from '@/lib/referendum'
import {refundable} from './shared'

const col = columnsFor<ProposedRow>()

function Refund({d, status}: {d: ProposedRow['deposits'][number]; status: string}) {
    if (d.state === 'Held') {
        if (status === 'Ongoing') return NONE
        return refundable(d.kind, status) ? <span className="text-dim">Refundable</span> : 'Never refunded'
    }
    return (
        <span>
            <BlockLink height={d.endedAt!} /> · {d.state === 'Slashed' ? <span className="text-destructive">Slashed</span> : 'Refunded'}
        </span>
    )
}

export function ProposedTable({rows, chain}: {rows: ProposedRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'referendum',
                    header: 'Referendum',
                    meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <Link href={`/referendum/${row.original.index}`} className="block max-w-44 truncate text-primary hover:underline sm:max-w-72">
                            <span className="font-mono">#{row.original.index}</span>
                            {row.original.title && <span className="text-foreground"> · {row.original.title}</span>}
                        </Link>
                    ),
                }),
                col.display({id: 'track', header: 'Track', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => trackLabel(row.original.track.name)}),
                col.display({id: 'status', header: 'Status', cell: ({row}) => <StatusTag phase={phaseOf(row.original)} />}),
                col.display({
                    id: 'deposit',
                    header: 'Deposit',
                    cell: ({row}) => (
                        <Lines
                            items={row.original.deposits.map(d => (
                                <Badge key={d.kind} variant="idle">
                                    {d.kind}
                                </Badge>
                            ))}
                        />
                    ),
                }),
                col.display({
                    id: 'amount',
                    header: 'Amount',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => <Lines end items={row.original.deposits.map(d => fmtBalance(d.amount, chain.decimals, chain.symbol))} />,
                }),
                col.display({
                    id: 'refund',
                    header: 'Refund',
                    meta: {cellClassName: 'text-muted-foreground whitespace-nowrap'},
                    cell: ({row}) => <Lines items={row.original.deposits.map(d => <Refund key={d.kind} d={d} status={row.original.status} />)} />,
                }),
                col.display({id: 'submitted', header: 'Submitted', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.submittedAt} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('referenda')} getRowId={r => String(r.index)} />
}
