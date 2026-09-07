'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {shortHash} from '@/lib/format'
import type {MultisigOpRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<MultisigOpRow>()

export function MultisigTable({rows, chain}: {rows: MultisigOpRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'hash', header: 'Call hash', meta: {cellClassName: 'font-mono text-[13px]'}, cell: ({row}) => shortHash(row.original.callHash, 6, 4)}),
                col.display({id: 'multisig', header: 'Multisig', meta: {className: 'w-1/2'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.multisig.id, chain.ss58)} acc={row.original.multisig} />}),
                col.display({
                    id: 'approvals',
                    header: 'Approvals',
                    meta: {cellClassName: 'font-mono'},
                    cell: ({row}) => `${row.original.approvals.length}${row.original.threshold != null ? ` / ${row.original.threshold}` : ''}`,
                }),
                col.display({id: 'opened', header: 'Opened by', meta: {className: 'w-1/2'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.depositor.id, chain.ss58)} acc={row.original.depositor} />}),
                col.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => {
                        const o = row.original
                        return (
                            <Badge variant={o.status === 'executed' ? (o.result === 'err' ? 'neg' : 'pos') : o.status === 'pending' ? 'warn' : 'idle'}>
                                {o.status === 'executed' ? (o.result === 'err' ? 'Exec failed' : 'Executed') : o.status === 'pending' ? 'Pending' : 'Cancelled'}
                            </Badge>
                        )
                    },
                }),
                col.display({id: 'updated', header: 'Updated', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.updatedBlock} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={o => o.id} />
}
