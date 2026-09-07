'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {StatusDot} from '@/components/pills'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import type {ChainProps} from '@/lib/chain'
import {shortHash} from '@/lib/format'
import type {BlockRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<BlockRow>()

export function BlocksTable({rows, chain}: {rows: BlockRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'height', header: 'Height', cell: ({row}) => <BlockLink height={row.original.height} />}),
                col.display({
                    id: 'hash',
                    header: 'Hash',
                    meta: {cellClassName: 'font-mono text-xs text-muted-foreground'},
                    cell: ({row}) => (
                        <Tip text={row.original.hash}>
                            <span>{shortHash(row.original.hash, 8, 6)}</span>
                        </Tip>
                    ),
                }),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                col.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => (
                        <span className="flex items-center gap-1.5">
                            <StatusDot tone={row.original.finalized ? 'pos' : 'warn'} />
                            <span className="text-xs">{row.original.finalized ? 'Finalized' : 'Confirming'}</span>
                        </span>
                    ),
                }),
                col.display({
                    id: 'miner',
                    header: 'Miner', meta: {className: 'w-full'},
                    cell: ({row}) => (row.original.author ? <AccountLink full addr={ss58Encode(row.original.author.id, chain.ss58)} acc={row.original.author} /> : <span className="text-dim">—</span>),
                }),
                col.display({id: 'extrinsics', header: 'Extrinsics', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.extrinsicCount}),
                col.display({id: 'events', header: 'Events', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => row.original.eventCount}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={b => b.id} />
}
