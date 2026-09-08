'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {bountyStatusTone} from '@/components/bounties'
import {columnsFor, DataTable} from '@/components/DataTable'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, humanize} from '@/lib/format'
import type {AccountRef, ChildBountyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

const col = columnsFor<ChildBountyRow>()

export function ChildBountiesTable({rows, chain}: {rows: ChildBountyRow[]; chain: ChainProps}) {
    const columns = useMemo(() => {
        const acc = (a: AccountRef | null) => (a ? <AccountLink addr={ss58Encode(a.id, chain.ss58)} acc={a} /> : NONE)
        return col.columns([
            col.display({id: 'index', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.original.childIndex}),
            col.display({
                id: 'child',
                header: 'Child bounty', meta: {className: 'w-full min-w-[24ch]'},
                cell: ({row}) => (
                    <Tip text={row.original.description}>
                        <span className="block max-w-[40ch] truncate">{row.original.description ?? `Child #${row.original.childIndex}`}</span>
                    </Tip>
                ),
            }),
            col.display({id: 'value', header: 'Value', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.value, chain.decimals, chain.symbol)}),
            col.display({id: 'curator', header: 'Curator', cell: ({row}) => acc(row.original.curator)}),
            col.display({id: 'beneficiary', header: 'Beneficiary', cell: ({row}) => acc(row.original.beneficiary)}),
            col.display({id: 'status', header: 'Status', meta: {align: 'right'}, cell: ({row}) => <Badge variant={bountyStatusTone(row.original.status)}>{humanize(row.original.status)}</Badge>}),
        ])
    }, [chain])
    return <DataTable columns={columns} rows={rows} getRowId={c => c.id} />
}
