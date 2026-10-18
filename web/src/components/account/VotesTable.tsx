'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {cn} from 'cn'
import Approx from '@/components/Approx'
import {VoteWeight} from '@/components/actions'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {Lines} from '@/components/Lines'
import {BlockLink} from '@/components/links'
import {StatusTag} from '@/components/referenda'
import {Badge} from '@/components/ui/badge'
import {VoteDetail, type VoteEntry} from '@/components/votes'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel, levelLabel, voteParts, type VoteSide} from '@/lib/conviction'
import {fmtBalance, fmtSpan} from '@/lib/format'
import type {AccountVoteRow} from '@/lib/gql'
import {phaseOf} from '@/lib/referendum'

const col = columnsFor<AccountVoteRow>()

const SIDE = {aye: ['pos', 'Aye'], nay: ['neg', 'Nay'], abstain: ['idle', 'Abstain']} as const satisfies Record<VoteSide, [string, string]>

export function VotesTable({rows, details, moreHref, head, chain}: {rows: AccountVoteRow[]; details: Map<string, VoteEntry>; moreHref: string; head: number; chain: ChainProps}) {
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
                        return <VoteWeight own={parts[0].votes} delegated={BigInt(details.get(row.original.id)?.delegatedVotes ?? 0)} decimals={chain.decimals} symbol={chain.symbol} />
                    },
                }),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({
                    id: 'unlocks',
                    header: 'Unlocks',
                    meta: {cellClassName: 'text-muted-foreground whitespace-nowrap'},
                    cell: ({row}) => {
                        const {lockedUntil: free, unlockedAt} = row.original
                        if (free == null) return NONE
                        return (
                            <>
                                <BlockLink height={unlockedAt ?? free} /> · {unlockedAt != null ? 'Unlocked' : free > head ? `in ${fmtSpan((free - head) * chain.blockTime)}` : <span className="text-dim">Unlockable</span>}
                            </>
                        )
                    },
                }),
                expander(col),
            ]),
        [chain, details, head]
    )
    return (
        <DataTable
            columns={columns}
            rows={rows}
            getRowId={v => v.id}
            canExpand={v => details.has(v.id)}
            expand={v => <VoteDetail v={details.get(v.id)!} moreHref={moreHref} decimals={chain.decimals} symbol={chain.symbol} />}
        />
    )
}
