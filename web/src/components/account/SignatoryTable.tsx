'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {SignatoryRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<SignatoryRow>()

export function SignatoryTable({rows, chain}: {rows: SignatoryRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'signatory', header: 'Signatory', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />}),
                col.display({id: 'approved', header: 'Approved', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.approved)}),
                col.display({id: 'opened', header: 'Opened', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.opened)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={s => s.account.id} />
}
