'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import type {ChainProps} from '@/lib/chain'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

export interface SubRow {
    id: string
    identitySubName: string | null
}

const col = columnsFor<SubRow>()

export function SubsTable({rows, chain}: {rows: SubRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'name', header: 'Sub identity', cell: ({row}) => row.original.identitySubName ?? NONE}),
                col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.id, chain.ss58)} />}),
            ]),
        [chain]
    )
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={s => s.id} />
}
