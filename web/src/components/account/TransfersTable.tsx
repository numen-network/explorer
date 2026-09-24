'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {CallPill} from '@/components/calls'
import {columnsFor, DataTable} from '@/components/DataTable'
import {ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {AccountRef, TransferRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE, SELF} from '@/components/Detail'

const col = columnsFor<TransferRow>()

export function TransfersTable({rows, hex, chain}: {rows: TransferRow[]; hex: string; chain: ChainProps}) {
    const columns = useMemo(() => {
        const side = (acc: AccountRef) => (acc.id === hex ? SELF : <AccountLink addr={ss58Encode(acc.id, chain.ss58)} acc={acc} />)
        return col.columns([
            col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} /> : NONE)}),
            col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            col.display({id: 'call', header: 'Call', cell: ({row}) => <CallPill call={row.original.call} />}),
            col.display({id: 'from', header: 'From', cell: ({row}) => side(row.original.from)}),
            col.display({id: 'to', header: 'To', meta: {className: 'w-full'}, cell: ({row}) => side(row.original.to)}),
            col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
        ])
    }, [hex, chain])
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={t => t.id} />
}
