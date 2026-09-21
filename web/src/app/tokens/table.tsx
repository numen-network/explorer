'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink, EvmAddrLink} from '@/components/links'
import TokenIcon from '@/components/TokenIcon'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {TokenRow} from '@/lib/gql'
import {NONE} from '@/components/Detail'

const col = columnsFor<TokenRow>()

export function TokensTable({rows}: {rows: TokenRow[]}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'token',
                    header: 'Token', meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <Link href={`/token/${row.original.id}`} className="text-primary hover:underline">
                            <TokenIcon addr={row.original.id} />
                            <span className="font-medium">{row.original.name ?? 'Unknown'}</span>
                            {row.original.symbol && <span className="ml-1.5 text-xs">{row.original.symbol}</span>}
                        </Link>
                    ),
                }),
                col.display({id: 'contract', header: 'Contract', cell: ({row}) => <EvmAddrLink addr={row.original.id} />}),
                col.display({id: 'supply', header: 'Total supply', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.totalSupply != null ? fmtBalance(row.original.totalSupply, row.original.decimals ?? 0, row.original.symbol ?? undefined) : NONE)}),
                col.display({id: 'holders', header: 'Holders', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.holderCount)}),
                col.display({id: 'transfers', header: 'Transfers', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.transferCount)}),
                col.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.deployBlock ?? row.original.firstBlock} />}),
            ]),
        []
    )
    return <DataTable columns={columns} rows={rows} empty="No tokens seen yet." getRowId={t => t.id} />
}
