'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {CallPill} from '@/components/calls'
import {columnsFor, DataTable} from '@/components/DataTable'
import {ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {TransferRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

const col = columnsFor<TransferRow>()

// the account's own side of a transfer reads as its label, the other side
// links out
export function TransfersTable({rows, hex, label, chain}: {rows: TransferRow[]; hex: string; label: string; chain: ChainProps}) {
    const columns = useMemo(() => {
        const self = <span className="truncate text-dim">{label}</span>
        const side = (t: TransferRow, from: boolean) => {
            const out = t.from.id === hex
            const other = out ? t.to : t.from
            const link = <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
            return from === out ? self : link
        }
        return col.columns([
            col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} hash={row.original.extrinsic.hash} /> : NONE)}),
            col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            col.display({id: 'call', header: 'Call', cell: ({row}) => <CallPill call={row.original.call} />}),
            col.display({id: 'from', header: 'From', cell: ({row}) => side(row.original, true)}),
            col.display({id: 'to', header: 'To', meta: {className: 'w-full'}, cell: ({row}) => side(row.original, false)}),
            col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
        ])
    }, [hex, label, chain])
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={t => t.id} />
}
