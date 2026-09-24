'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {CallPill} from '@/components/calls'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {TransferRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

const col = columnsFor<TransferRow>()

export function TransfersTable({rows, chain}: {rows: TransferRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'extrinsic',
                    header: 'Extrinsic',
                    cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} /> : NONE),
                }),
                col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block.height} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                col.display({id: 'from', header: 'From', cell: ({row}) => <AccountLink addr={ss58Encode(row.original.from.id, chain.ss58)} acc={row.original.from} />}),
                col.display({id: 'to', header: 'To', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.to.id, chain.ss58)} acc={row.original.to} />}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                col.display({id: 'call', header: 'Call', meta: {align: 'right'}, cell: ({row}) => <CallPill call={row.original.call} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty="No transfers yet." getRowId={t => t.id} />
}
