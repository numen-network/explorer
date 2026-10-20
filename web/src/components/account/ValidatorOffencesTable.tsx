'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {emptyText} from '@/components/EmptyList'
import {BlockLink, EventLink, ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ValidatorOffenceRow} from '@/lib/gql'

const col = columnsFor<ValidatorOffenceRow>()

export function ValidatorOffencesTable({rows}: {rows: ValidatorOffenceRow[]}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'event', header: 'Event', cell: ({row}) => <EventLink height={row.original.block} index={row.original.event.indexInBlock} />}),
                col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                col.display({id: 'kind', header: 'Kind', cell: ({row}) => <Badge variant="neg">{row.original.kind}</Badge>}),
                col.display({
                    id: 'extrinsic',
                    header: 'Extrinsic',
                    meta: {className: 'w-full'},
                    cell: ({row}) => (row.original.event.extrinsic ? <ExtrinsicLink id={row.original.event.extrinsic.id} /> : NONE),
                }),
            ]),
        []
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('offences')} getRowId={o => o.id} />
}
