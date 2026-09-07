'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {bountyStatusLabel, bountyStatusTone, RefCell} from '@/components/bounties'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {fmtBalance} from '@/lib/format'
import {type BountyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<BountyRow>()

export function BountyTable({rows, chain}: {rows: BountyRow[]; chain: {ss58: number; decimals: number; symbol: string}}) {
    const columns = useMemo(
        () => [
            col.display({id: 'index', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.original.index}),
            col.display({
                id: 'bounty',
                header: 'Bounty', meta: {className: 'w-full min-w-[24ch]'},
                cell: ({row}) => (
                    <Tip text={row.original.description}>
                        <Link href={`/bounty/${row.original.index}`} className="block max-w-[40ch] truncate font-medium hover:text-primary">
                            {row.original.description ?? `Bounty #${row.original.index}`}
                        </Link>
                    </Tip>
                ),
            }),
            col.display({id: 'value', header: 'Value', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.value, chain.decimals, chain.symbol)}),
            col.display({
                id: 'curator',
                header: 'Curator',
                cell: ({row}) => (row.original.curator ? <AccountLink addr={ss58Encode(row.original.curator.id, chain.ss58)} acc={row.original.curator} /> : <span className="text-dim">—</span>),
            }),
            col.display({id: 'referendum', header: 'Referendum', cell: ({row}) => <RefCell r={row.original.referendum} />}),
            col.display({id: 'status', header: 'Status', cell: ({row}) => <Badge variant={bountyStatusTone(row.original.status)}>{bountyStatusLabel(row.original.status)}</Badge>}),
            col.display({id: 'updated', header: 'Updated', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.updatedAt} />}),
        ],
        [chain]
    )
    return (
        <Card size="flush">
            <DataTable columns={columns} rows={rows} empty="No bounties yet." getRowId={b => b.id} />
        </Card>
    )
}
