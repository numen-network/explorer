'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {LockExpiry, RejoinAfter, ValidatorStatus} from '@/components/ValidatorStatus'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {ValidatorListRow} from '@/lib/gql'
import {OFFENCE_LABEL} from '@/lib/offences'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<ValidatorListRow>()
const num = {align: 'right', cellClassName: 'font-mono'} as const
const tally = (v: ValidatorListRow, kind: string) => v.offences.filter(o => o.kind === kind).length

export function ValidatorsTable({rows, chain, head, renewEvery}: {rows: ValidatorListRow[]; chain: ChainProps; head: number; renewEvery: string}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'validator', header: 'Validator', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />}),
                col.display({id: 'status', header: 'Status', cell: ({row}) => <ValidatorStatus v={row.original} />}),
                col.display({id: 'locked', header: 'Locked', meta: num, cell: ({row}) => fmtBalance(row.original.lockedAmount, chain.decimals, chain.symbol)}),
                col.display({id: 'expiry', header: 'Lock expiry', meta: num, cell: ({row}) => <LockExpiry v={row.original} renewEvery={renewEvery} />}),
                col.display({id: 'rejoin', header: 'Rejoin after', meta: num, cell: ({row}) => <RejoinAfter v={row.original} head={head} />}),
                col.display({id: 'offline', header: OFFENCE_LABEL.Offline, meta: num, cell: ({row}) => fmtInt(tally(row.original, 'Offline'))}),
                col.display({id: 'equivocations', header: OFFENCE_LABEL.Equivocation, meta: num, cell: ({row}) => fmtInt(tally(row.original, 'Equivocation'))}),
                col.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.firstSeenBlock} />}),
                col.display({id: 'session', header: 'Last session', meta: num, cell: ({row}) => (row.original.lastActiveSession != null ? `#${fmtInt(row.original.lastActiveSession)}` : '—')}),
            ]),
        [chain, head, renewEvery]
    )
    return <DataTable columns={columns} rows={rows} getRowId={v => v.id} />
}
