'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {Tip} from '@/components/Tip'
import type {DigestLog} from '@/lib/digest'

const col = columnsFor<DigestLog>()

export function DigestTable({rows}: {rows: DigestLog[]}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'index', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.original.index}),
                col.display({id: 'kind', header: 'Type', cell: ({row}) => row.original.kind}),
                col.display({id: 'engine', header: 'Engine', meta: {cellClassName: 'font-mono text-[13px] text-muted-foreground'}, cell: ({row}) => row.original.engine ?? '—'}),
                col.display({
                    id: 'data',
                    header: 'Data',
                    meta: {className: 'w-full', cellClassName: 'font-mono text-[13px]'},
                    cell: ({row}) => (
                        <Tip text={<span className="max-w-lg break-all">{row.original.data}</span>}>
                            <span className="block max-w-[48ch] truncate">{row.original.data}</span>
                        </Tip>
                    ),
                }),
            ]),
        []
    )
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={l => String(l.index)} />
}
