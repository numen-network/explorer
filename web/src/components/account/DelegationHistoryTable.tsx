'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {emptyText} from '@/components/EmptyList'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel} from '@/lib/conviction'
import {fmtBalance, trackLabel} from '@/lib/format'
import type {DelegationActionRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<DelegationActionRow>()

const VERB: Record<string, {out: string; in: string}> = {
    Delegated: {out: 'Delegated to', in: 'Delegated by'},
    Undelegated: {out: 'Undelegated from', in: 'Undelegated by'},
}

export function DelegationHistoryTable({rows, hex, chain}: {rows: DelegationActionRow[]; hex: string; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'action',
                    header: 'Action',
                    meta: {className: 'w-full'},
                    cell: ({row}) => {
                        const out = row.original.who.id === hex
                        const other = out ? row.original.target : row.original.who
                        return (
                            <span>
                                {VERB[row.original.method][out ? 'out' : 'in']} <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
                            </span>
                        )
                    },
                }),
                col.display({id: 'track', header: 'Track', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => trackLabel(row.original.track.name)}),
                col.display({id: 'conviction', header: 'Conviction', meta: {cellClassName: 'font-mono'}, cell: ({row}) => (row.original.conviction == null ? NONE : convictionLabel(row.original.conviction))}),
                col.display({
                    id: 'amount',
                    header: 'Amount',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => (row.original.balance == null ? NONE : fmtBalance(row.original.balance, chain.decimals, chain.symbol)),
                }),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            ]),
        [hex, chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('delegation actions')} emptyClassName="py-5" getRowId={a => a.id} />
}
