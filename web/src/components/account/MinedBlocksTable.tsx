'use client'

import {useMemo} from 'react'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import {emptyText} from '@/components/EmptyList'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import type {ChainProps} from '@/lib/chain'
import {shortHash} from '@/lib/format'
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
                    header: 'Reward',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => <Approx planck={BigInt(row.original.reward) + BigInt(row.original.minerFees)} decimals={chain.decimals} symbol={chain.symbol} />,
                }),
            ]),
        [chain]
    )
    return <DataTable empty={emptyText('blocks')} emptyClassName="py-5" columns={columns} rows={rows} getRowId={b => b.id} />
}
