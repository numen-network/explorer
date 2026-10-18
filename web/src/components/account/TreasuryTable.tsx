'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import {RefCell} from '@/components/bounties'
import {columnsFor, DataTable} from '@/components/DataTable'
import {emptyText} from '@/components/EmptyList'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {TreasuryPayoutRow} from '@/lib/gql'

export const SOURCE_LABEL = {Spend: 'Spend', Bounty: 'Bounty', ChildBounty: 'Child bounty'} as const

function Source({p}: {p: TreasuryPayoutRow}) {
    const target =
        p.bounty != null
            ? {id: `#${p.bounty.index}`, title: p.bounty.description, href: `/bounty/${p.bounty.index}`}
            : p.childBounty != null
              ? {id: `#${p.childBounty.parent.index}-${p.childBounty.childIndex}`, title: p.childBounty.description, href: `/bounty/${p.childBounty.parent.index}`}
              : null
    return (
        <span className="block max-w-56 truncate sm:max-w-96">
            <span className="text-muted-foreground">{SOURCE_LABEL[p.source]} </span>
            {target == null ? (
                <span className="font-mono">#{p.spend!.id.split('-')[1]}</span>
            ) : (
                <Link href={target.href} className="text-primary hover:underline">
                    <span className="font-mono">{target.id}</span>
                    {target.title && <span className="text-foreground"> · {target.title}</span>}
                </Link>
            )}
        </span>
    )
}

const col = columnsFor<TreasuryPayoutRow>()

export function TreasuryTable({rows, chain, filtered}: {rows: TreasuryPayoutRow[]; chain: ChainProps; filtered?: boolean}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'source', header: 'Source', meta: {className: 'w-full'}, cell: ({row}) => <Source p={row.original} />}),
                col.display({id: 'role', header: 'Role', cell: ({row}) => <Badge variant={row.original.role === 'Curator' ? 'idle' : 'primary'}>{row.original.role}</Badge>}),
                col.display({id: 'referendum', header: 'Referendum', cell: ({row}) => <RefCell r={row.original.spend?.referendum ?? row.original.bounty?.referendum} />}),
                col.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                col.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('payments', filtered)} getRowId={p => p.id} />
}
