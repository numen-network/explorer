'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {ValidatorRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {variantName} from '@/lib/variant'

const col = columnsFor<ValidatorRow>()
const num = {align: 'right', cellClassName: 'font-mono'} as const

export function ValidatorsTable({rows, chain}: {rows: ValidatorRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'validator', header: 'Validator', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />}),
                col.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => {
                        const kicked = variantName(row.original.kicked)
                        return (
                            <Badge variant={kicked ? 'neg' : row.original.active ? 'pos' : 'idle'}>
                                {kicked ? `Kicked · ${kicked}` : row.original.active ? 'Active' : 'Inactive'}
                            </Badge>
                        )
                    },
                }),
                col.display({id: 'locked', header: 'Locked', meta: num, cell: ({row}) => fmtBalance(row.original.lockedAmount, chain.decimals, chain.symbol)}),
                col.display({id: 'expiry', header: 'Lock expiry', meta: num, cell: ({row}) => (row.original.lockExpiry ? fmtInt(row.original.lockExpiry) : '—')}),
                col.display({id: 'offline', header: 'Offline sessions', meta: num, cell: ({row}) => fmtInt(row.original.offlineSessions)}),
                col.display({id: 'equivocations', header: 'Equivocations', meta: num, cell: ({row}) => fmtInt(row.original.equivocations)}),
                col.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.firstSeenBlock} />}),
                col.display({id: 'session', header: 'Last session', meta: num, cell: ({row}) => `#${fmtInt(row.original.lastActiveSession)}`}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={v => v.id} />
}
