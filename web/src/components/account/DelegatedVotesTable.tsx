'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {StatusTag} from '@/components/referenda'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel} from '@/lib/conviction'
import {fmtBalance} from '@/lib/format'
import type {DelegatedVoteRow} from '@/lib/gql'
import {phaseOf} from '@/lib/referendum'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<DelegatedVoteRow>()

export function DelegatedVotesTable({rows, chain}: {rows: DelegatedVoteRow[]; chain: ChainProps}) {
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
                col.display({id: 'via', header: 'Via', cell: ({row}) => <AccountLink addr={ss58Encode(row.original.voter.id, chain.ss58)} acc={row.original.voter} />}),
                col.display({id: 'vote', header: 'Vote', cell: ({row}) => (row.original.aye ? <Badge variant="pos">Aye</Badge> : <Badge variant="neg">Nay</Badge>)}),
                col.display({id: 'conviction', header: 'Conviction', meta: {cellClassName: 'font-mono'}, cell: ({row}) => convictionLabel(row.original.conviction)}),
                col.display({id: 'capital', header: 'Capital', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.balance, chain.decimals, chain.symbol)}),
                col.display({id: 'votes', header: 'Votes', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => <Approx planck={row.original.votes} decimals={chain.decimals} symbol={chain.symbol} />}),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={d => d.id} />
}
