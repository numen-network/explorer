'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {shortHash} from '@/lib/format'
import type {AccountRef, MultisigOpRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {variantName} from '@/lib/variant'
import {SELF} from '@/components/Detail'

const col = columnsFor<MultisigOpRow>()

export function MultisigTable({rows, hex, chain}: {rows: MultisigOpRow[]; hex: string; chain: ChainProps}) {
    const columns = useMemo(() => {
        const side = (acc: AccountRef) => (acc.id === hex ? SELF : <AccountLink addr={ss58Encode(acc.id, chain.ss58)} acc={acc} />)
        return col.columns([
            col.display({id: 'hash', header: 'Call hash', meta: {cellClassName: 'font-mono text-[13px]'}, cell: ({row}) => shortHash(row.original.callHash, 6, 4)}),
            col.display({id: 'multisig', header: 'Multisig', meta: {className: 'w-1/2'}, cell: ({row}) => side(row.original.multisig)}),
            col.display({
                id: 'approvals',
                header: 'Approvals',
                meta: {cellClassName: 'font-mono'},
                cell: ({row}) => `${row.original.approvals.length}${row.original.threshold != null ? ` / ${row.original.threshold}` : ''}`,
            }),
            col.display({id: 'opened', header: 'Opened by', meta: {className: 'w-1/2'}, cell: ({row}) => side(row.original.depositor)}),
            col.display({
                id: 'status',
                header: 'Status',
                cell: ({row}) => {
                    const o = row.original
                    const failed = variantName(o.result) === 'Err'
                    const executed = o.status === 'MultisigExecuted'
                    const open = o.status === 'NewMultisig' || o.status === 'MultisigApproval'
                    return (
                        <Badge variant={executed ? (failed ? 'neg' : 'pos') : open ? 'warn' : 'idle'}>
                            {executed ? (failed ? 'Exec failed' : 'Executed') : open ? 'Pending' : 'Cancelled'}
                        </Badge>
                    )
                },
            }),
            col.display({id: 'updated', header: 'Updated', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.updatedBlock} />}),
        ])
    }, [hex, chain])
    return <DataTable columns={columns} rows={rows} getRowId={o => o.id} />
}
