'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {MembershipRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<MembershipRow>()

export function MembershipTable({rows, chain}: {rows: MembershipRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'multisig', header: 'Multisig address', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original.account} />}),
                col.display({
                    id: 'signatories',
                    header: 'Signatories',
                    meta: {cellClassName: 'font-mono'},
                    cell: ({row}) => `${fmtInt(row.original.threshold)} of ${fmtInt(row.original.signatories.length)}`,
                }),
                col.display({id: 'pending', header: 'Pending', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.pending)}),
                col.display({id: 'operations', header: 'Operations', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.operations)}),
                col.display({id: 'active', header: 'Last active', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.lastActiveBlock} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={m => m.id} />
}
