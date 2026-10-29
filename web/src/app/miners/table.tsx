'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import ShareBar from '@/components/ShareBar'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {MinerStat} from '@/lib/miners'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<MinerStat>()

export function MinersTable({rows, heights, totalBlocks, chain}: {rows: MinerStat[]; heights: Map<string, number>; totalBlocks: number; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'rank', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.index + 1}),
                col.display({id: 'miner', header: 'Miner', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original.acc} />}),
                col.display({id: 'latest', header: 'Latest Block', cell: ({row}) => <BlockLink height={heights.get(row.original.id)!} />}),
                col.display({id: 'blocks', header: 'Blocks', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.blocks)}),
                col.display({id: 'share', header: 'Share', meta: {align: 'right'}, cell: ({row}) => <ShareBar part={String(row.original.blocks)} whole={String(totalBlocks)} />}),
                col.display({id: 'rewards', header: 'Rewards', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.rewards, chain.decimals, chain.symbol)}),
            ]),
        [chain, heights, totalBlocks]
    )
    return <DataTable columns={columns} rows={rows} empty="No blocks in this window." getRowId={m => m.id} />
}
