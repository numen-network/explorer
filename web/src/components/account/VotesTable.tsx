'use client'

import type {ReactNode} from 'react'
import Link from 'next/link'
import {useMemo} from 'react'
import {cn} from 'cn'
import Approx from '@/components/Approx'
import {VoteWeight} from '@/components/actions'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {BlockLink} from '@/components/links'
import {StatusTag} from '@/components/referenda'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel, levelLabel, unlockAt, voteParts, type VoteSide} from '@/lib/conviction'
import {fmtBalance} from '@/lib/format'
import type {AccountVoteRow} from '@/lib/gql'
import {phaseOf} from '@/lib/referendum'

const col = columnsFor<AccountVoteRow>()

const SIDE = {aye: ['pos', 'Aye'], nay: ['neg', 'Nay'], abstain: ['idle', 'Abstain']} as const satisfies Record<VoteSide, [string, string]>

// one line per side a vote takes, the same height in every column so a split lines up across the row
function Lines({items, end}: {items: ReactNode[]; end?: boolean}) {
    return (
        <div className={cn('flex flex-col', end ? 'items-end' : 'items-start')}>
            {items.map((item, i) => (
                <div key={i} className="flex h-6 items-center">
                    {item}
                </div>
            ))}
        </div>
    )
}

export function VotesTable({rows, delegated, chain}: {rows: AccountVoteRow[]; delegated: Map<number, bigint>; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'referendum',
                    header: 'Referendum',
                    meta: {className: 'w-full'},
                    cell: ({row}) => {
                        const {referendum, removed} = row.original
                        return (
                            <span className={cn('flex items-center gap-2', removed && 'opacity-50')}>
                                <Link href={`/referendum/${referendum.index}`} className="block max-w-44 truncate text-primary hover:underline sm:max-w-72">
                                    <span className="font-mono">#{referendum.index}</span>
                                    {referendum.title && <span className="text-foreground"> · {referendum.title}</span>}
                                </Link>
                                {removed && <span className="text-[11px] text-dim">removed</span>}
                            </span>
                        )
                    },
                }),
                col.display({id: 'status', header: 'Status', cell: ({row}) => <StatusTag phase={phaseOf(row.original.referendum)} />}),
                col.display({
                    id: 'vote',
                    header: 'Vote',
                    cell: ({row}) => (
                        <Lines
                            items={voteParts(row.original).map(p => (
                                <Badge key={p.side} variant={SIDE[p.side][0]}>
                                    {SIDE[p.side][1]}
                                </Badge>
                            ))}
                        />
                    ),
                }),
                col.display({
                    id: 'conviction',
                    header: 'Conviction',
                    meta: {cellClassName: 'font-mono'},
                    cell: ({row}) => (row.original.kind === 'Standard' ? convictionLabel(row.original.conviction) : levelLabel(0)),
                }),
                col.display({
                    id: 'capital',
                    header: 'Capital',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => <Lines end items={voteParts(row.original).map(p => fmtBalance(p.capital, chain.decimals, chain.symbol))} />,
                }),
                col.display({
                    id: 'votes',
                    header: 'Votes',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => {
                        const parts = voteParts(row.original)
                        if (row.original.kind !== 'Standard') return <Lines end items={parts.map(p => <Approx planck={p.votes} decimals={chain.decimals} symbol={chain.symbol} />)} />
                        return <VoteWeight own={parts[0].votes} delegated={delegated.get(row.original.referendum.index) ?? 0n} decimals={chain.decimals} symbol={chain.symbol} />
                    },
                }),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({
                    id: 'unlocks',
                    header: 'Unlocks',
                    meta: {cellClassName: 'text-muted-foreground'},
                    cell: ({row}) => {
                        const free = unlockAt(row.original, row.original.referendum, chain.voteLockingPeriod)
                        return free != null ? <BlockLink height={free} /> : NONE
                    },
                }),
            ]),
        [chain, delegated]
    )
    return <DataTable columns={columns} rows={rows} getRowId={v => v.id} />
}
