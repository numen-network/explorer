'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {emptyText} from '@/components/EmptyList'
import {BlockLink} from '@/components/links'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel} from '@/lib/conviction'
import {fmtBalance, trackLabel} from '@/lib/format'
import type {DelegationRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<DelegationRow>()

export function DelegationsTable({label, rows, chain, filtered}: {label: string; rows: DelegationRow[]; chain: ChainProps; filtered?: boolean}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'track', header: 'Track', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => trackLabel(row.original.track.name)}),
                col.display({
                    id: 'other',
                    header: label, meta: {className: 'w-full'},
                    cell: ({row}) => {
                        const other = row.original.target ?? row.original.who
                        return other && <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
                    },
                }),
                col.display({id: 'conviction', header: 'Conviction', meta: {cellClassName: 'font-mono'}, cell: ({row}) => convictionLabel(row.original.conviction)}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.balance, chain.decimals, chain.symbol)}),
                col.display({id: 'since', header: 'Since', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            ]),
        [label, chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('delegations', filtered)} getRowId={d => d.id} />
}
