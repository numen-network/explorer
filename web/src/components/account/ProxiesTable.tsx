'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {ProxyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<ProxyRow>()

export function ProxiesTable({label, rows, chain}: {label: string; rows: ProxyRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'other',
                    header: label, meta: {className: 'w-full'},
                    cell: ({row}) => {
                        const other = row.original.delegatee ?? row.original.delegator
                        return other && <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
                    },
                }),
                col.display({id: 'type', header: 'Type', cell: ({row}) => <Badge variant={row.original.proxyType === 'Any' ? 'warn' : 'idle'}>{row.original.proxyType}</Badge>}),
                col.display({id: 'delay', header: 'Delay', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.delay > 0 ? fmtInt(row.original.delay) : '—')}),
            ]),
        [label, chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={p => p.id} />
}
