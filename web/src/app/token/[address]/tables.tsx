'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink, EvmAddrLink} from '@/components/links'
import ShareBar from '@/components/ShareBar'
import {fmtApprox, fmtInt} from '@/lib/format'
import type {EvmActivity} from '@/lib/gql'

export interface Holder {
    id: string
    address: string
    balance: string
    activity: EvmActivity
}

const hcol = columnsFor<Holder>()

export function HoldersTable({rows, offset, supply, decimals, symbol}: {rows: Holder[]; offset: number; supply: string | null; decimals: number; symbol?: string}) {
    const columns = useMemo(
        () =>
            hcol.columns([
                hcol.display({id: 'rank', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => offset + row.index + 1}),
                hcol.display({id: 'address', header: 'Address', meta: {className: 'w-full'}, cell: ({row}) => <EvmAddrLink addr={row.original.address} full />}),
                hcol.display({id: 'balance', header: 'Balance', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtApprox(row.original.balance, decimals, symbol)}),
                hcol.display({id: 'share', header: 'Share', meta: {align: 'right'}, cell: ({row}) => <ShareBar part={row.original.balance} whole={supply} />}),
                hcol.display({id: 'txs', header: 'Transactions', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.activity.txCount)}),
                hcol.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.activity.firstSeenBlock} />}),
                hcol.display({id: 'last', header: 'Last active', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.activity.lastActiveBlock} />}),
            ]),
        [offset, supply, decimals, symbol]
    )
    return <DataTable columns={columns} rows={rows} getRowId={h => h.id} />
}
