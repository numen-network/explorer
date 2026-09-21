'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AddressText from '@/components/AddressText'
import {columnsFor, DataTable} from '@/components/DataTable'
import {EvmAddrLink, EvmTxLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import TokenIcon from '@/components/TokenIcon'
import {fmtBalance} from '@/lib/format'
import type {TokenTransferRow} from '@/lib/gql'
import {SELF} from '@/components/Detail'

const col = columnsFor<TokenTransferRow>()

export function TokenTransfersTable({rows, evm}: {rows: TokenTransferRow[]; evm: string}) {
    const columns = useMemo(() => {
        const side = (a: string) => (a === evm ? SELF : <EvmAddrLink addr={a} />)
        return col.columns([
            col.display({id: 'tx', header: 'Transaction', cell: ({row}) => <EvmTxLink hash={row.original.transaction.id} />}),
            col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            col.display({id: 'from', header: 'From', meta: {className: 'w-1/2'}, cell: ({row}) => side(row.original.from)}),
            col.display({id: 'to', header: 'To', meta: {className: 'w-1/2'}, cell: ({row}) => side(row.original.to)}),
            col.display({
                id: 'token',
                header: 'Token',
                cell: ({row}) => (
                    <Link href={`/token/${row.original.token.id}`} className="text-primary hover:underline">
                        <TokenIcon addr={row.original.token.id} />
                        {row.original.token.symbol ?? <AddressText addr={row.original.token.id} />}
                    </Link>
                ),
            }),
            col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, row.original.token.decimals ?? 0)}),
        ])
    }, [evm])
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={t => t.id} />
}
