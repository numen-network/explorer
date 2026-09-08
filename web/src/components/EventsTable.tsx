'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {JsonBlock, NONE} from '@/components/Detail'
import {ExtrinsicLink} from '@/components/links'
import type {CallRef, EventRow} from '@/lib/gql'

const col = columnsFor<EventRow>()

// the block view says which extrinsic raised the event, the extrinsic view
// already knows and only names the inner call when a batch or proxy hid it
export function EventsTable({rows, view, parent}: {rows: EventRow[]; view: 'block' | 'extrinsic'; parent?: CallRef}) {
    const columns = useMemo(() => {
        const from = (e: EventRow) => e.call && (view === 'block' || e.call.pallet !== parent?.pallet || e.call.method !== parent?.method)
        const base = [
            col.display({id: 'index', header: '#', meta: {className: view === 'block' ? 'min-w-14 pr-0' : 'min-w-12 pr-0', cellClassName: 'font-mono text-xs text-muted-foreground'}, cell: ({row}) => row.original.indexInBlock}),
            col.display({
                id: 'event',
                header: 'Event',
                meta: {className: 'w-full', cellClassName: 'font-mono text-[13px]'},
                cell: ({row}) => (
                    <>
                        {row.original.pallet}.{row.original.method}
                        {from(row.original) && (
                            <span className="ml-2 text-[11px] text-dim">
                                from {row.original.call!.pallet}.{row.original.call!.method}
                            </span>
                        )}
                    </>
                ),
            }),
        ]
        if (view === 'extrinsic') return col.columns(base)
        return col.columns([
            ...base,
            col.display({id: 'phase', header: 'Phase', meta: {className: 'min-w-[140px]', cellClassName: 'text-xs text-dim'}, cell: ({row}) => row.original.phase}),
            col.display({
                id: 'extrinsic',
                header: 'Extrinsic',
                meta: {className: 'min-w-[180px]', cellClassName: 'text-xs'},
                cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} hash={row.original.extrinsic.hash} /> : NONE),
            }),
        ])
    }, [view, parent])
    return <DataTable columns={columns} rows={rows} head={view === 'block'} headClassName="font-normal" emptyClassName="py-5" getRowId={e => e.id} canExpand={() => true} expand={e => <div className="px-5 pt-2 pb-2.5 pl-16"><JsonBlock value={e.args} /></div>} />
}
