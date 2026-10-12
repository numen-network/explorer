'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {ArgsView} from '@/components/ArgsTable'
import {NONE} from '@/components/Detail'
import {BlockLink, EventLink, ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ArgNode} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import type {CallRef, EventRow} from '@/lib/gql'

type Row = EventRow & {view: ArgNode | null}

const col = columnsFor<Row>()

// the event list gives each event its own place, the call that raised it under the name
function listColumns() {
    return col.columns([
        col.display({id: 'id', header: 'Event', cell: ({row}) => <EventLink height={row.original.block.height} index={row.original.indexInBlock} />}),
        col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block.height} />}),
        col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.block.timestamp} />}),
        col.display({
            id: 'event',
            header: 'Name',
            meta: {className: 'w-full'},
            cell: ({row}) => (
                <div className="font-mono text-[13px]">
                    <div>
                        {row.original.pallet}.{row.original.method}
                    </div>
                    {row.original.call && (
                        <div className="mt-0.5 text-[11px] text-dim">
                            from {row.original.call.pallet}.{row.original.call.method}
                        </div>
                    )}
                </div>
            ),
        }),
        col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} /> : NONE)}),
        col.display({id: 'phase', header: 'Phase', meta: {cellClassName: 'text-xs text-dim'}, cell: ({row}) => row.original.phase}),
    ])
}

// the block view says which extrinsic raised the event, the extrinsic view
// already knows and only names the inner call when a batch or proxy hid it
export function EventsTable({rows, view, parent, chain, empty}: {rows: Row[]; view: 'list' | 'block' | 'extrinsic'; parent?: CallRef; chain: ChainProps; empty?: string}) {
    const columns = useMemo(() => {
        if (view === 'list') return listColumns()
        const from = (e: Row) => e.call && (view === 'block' || e.call.pallet !== parent?.pallet || e.call.method !== parent?.method)
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
                cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} /> : NONE),
            }),
        ])
    }, [view, parent])
    return (
        <DataTable
            columns={columns}
            rows={rows}
            empty={empty}
            head={view !== 'extrinsic'}
            headClassName={view === 'block' ? 'font-normal' : undefined}
            emptyClassName={view === 'list' ? undefined : 'py-5'}
            getRowId={e => e.id}
            canExpand={() => true}
            expand={e => (
                <div className={view === 'list' ? 'px-5 pt-2 pb-2.5' : 'px-5 pt-2 pb-2.5 pl-16'}>
                    <ArgsView node={e.view} raw={e.args} chain={chain} />
                </div>
            )}
        />
    )
}
