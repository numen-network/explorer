'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import type {ChainProps} from '@/lib/chain'
import {subName} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

export interface SubRow {
    id: string
    identitySubName: string | null
    identitySubData: unknown
}

const col = columnsFor<SubRow>()

export function SubsTable({rows, chain}: {rows: SubRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                // a Raw name holds 32 bytes at most
                col.display({id: 'name', header: 'Sub identity', cell: ({row}) => <span className="block max-w-[32ch] truncate">{subName(row.original) ?? NONE}</span>}),
                col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.id, chain.ss58)} />}),
            ]),
        [chain]
    )
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={s => s.id} />
}
