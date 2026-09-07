'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {Progress} from '@/components/ui/progress'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {AccountRef} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export interface MinerStat {
    id: string
    acc: AccountRef
    blocks: number
    rewards: string
}

const col = columnsFor<MinerStat>()

export function MinersTable({rows, totalBlocks, chain}: {rows: MinerStat[]; totalBlocks: number; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'rank', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.index + 1}),
                col.display({id: 'miner', header: 'Miner', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original.acc} />}),
                col.display({id: 'blocks', header: 'Blocks', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.blocks)}),
                col.display({
                    id: 'share',
                    header: 'Share',
                    cell: ({row}) => {
                        const share = totalBlocks > 0 ? (row.original.blocks / totalBlocks) * 100 : 0
                        return (
                            <div className="flex items-center gap-2">
                                <Progress value={share} className="h-1.5 w-40" />
                                <span className="w-14 font-mono text-xs text-muted-foreground">{share.toFixed(2)}%</span>
                            </div>
                        )
                    },
                }),
                col.display({id: 'rewards', header: 'Rewards', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.rewards, chain.decimals, chain.symbol)}),
            ]),
        [chain, totalBlocks]
    )
    return <DataTable columns={columns} rows={rows} empty="No blocks in this window." getRowId={m => m.id} />
}
