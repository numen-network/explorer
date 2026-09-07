'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AddressText from '@/components/AddressText'
import {columnsFor, DataTable} from '@/components/DataTable'
import {EvmAddrLink, EvmTxLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {fmtBalance} from '@/lib/format'
import type {TokenTransferRow} from '@/lib/gql'

const col = columnsFor<TokenTransferRow>()

export function TokenTransfersTable({rows}: {rows: TokenTransferRow[]}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'tx', header: 'Transaction', cell: ({row}) => <EvmTxLink hash={row.original.transaction.id} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                col.display({id: 'from', header: 'From', meta: {className: 'w-1/2'}, cell: ({row}) => <EvmAddrLink addr={row.original.from} />}),
                col.display({id: 'to', header: 'To', meta: {className: 'w-1/2'}, cell: ({row}) => <EvmAddrLink addr={row.original.to} />}),
                col.display({
                    id: 'token',
                    header: 'Token',
                    cell: ({row}) => (
                        <Link href={`/token/${row.original.token.id}`} className="text-primary hover:underline">
                            {row.original.token.symbol ?? <AddressText addr={row.original.token.id} />}
                        </Link>
                    ),
                }),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, row.original.token.decimals ?? 0)}),
            ]),
        []
    )
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={t => t.id} />
}
