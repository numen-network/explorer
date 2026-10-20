'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {emptyText} from '@/components/EmptyList'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, shortHash} from '@/lib/format'
import type {MinedBlockRow} from '@/lib/gql'

const col = columnsFor<MinedBlockRow>()

export function MinedBlocksTable({rows, chain}: {rows: MinedBlockRow[]; chain: ChainProps}) {
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
                            <span>{shortHash(row.original.hash)}</span>
                        </Tip>
                    ),
                }),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {className: 'w-full', cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                col.display({
                    id: 'reward',
                    header: 'Production reward',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => fmtBalance(row.original.reward, chain.decimals, chain.symbol),
                }),
                col.display({
                    id: 'fees',
                    header: 'Fees',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => fmtBalance(row.original.minerFees, chain.decimals, chain.symbol),
                }),
            ]),
        [chain]
    )
    return <DataTable empty={emptyText('blocks')} emptyClassName="py-5" columns={columns} rows={rows} getRowId={b => b.id} />
}
