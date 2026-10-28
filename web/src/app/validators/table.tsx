'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Progress} from '@/components/ui/progress'
import {LockExpiry, RejoinAfter, ValidatorStatus} from '@/components/ValidatorStatus'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {SessionRow, ValidatorListRow} from '@/lib/gql'
import {OFFENCE_LABEL} from '@/lib/offences'
import {ss58Encode} from '@/lib/ss58'
import type {ValidatorRules} from '@/lib/validatorRules'

const col = columnsFor<ValidatorListRow>()
const num = {align: 'right', cellClassName: 'font-mono'} as const
const tally = (v: ValidatorListRow, kind: string) => v.offences.filter(o => o.kind === kind).length

export function ValidatorsTable({rows, chain, head, rules}: {rows: ValidatorListRow[]; chain: ChainProps; head: number; rules: ValidatorRules}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'validator', header: 'Validator', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />}),
                col.display({id: 'status', header: 'Status', cell: ({row}) => <ValidatorStatus v={row.original} />}),
                col.display({id: 'locked', header: 'Locked', meta: num, cell: ({row}) => fmtBalance(row.original.lockedAmount, chain.decimals, chain.symbol)}),
                col.display({id: 'expiry', header: 'Lock expiry', meta: num, cell: ({row}) => <LockExpiry v={row.original} renewEvery={rules.renewEvery} />}),
                col.display({id: 'rejoin', header: 'Rejoin after', meta: num, cell: ({row}) => <RejoinAfter v={row.original} head={head} />}),
                col.display({id: 'offline', header: OFFENCE_LABEL.Offline, meta: num, cell: ({row}) => fmtInt(tally(row.original, 'Offline'))}),
                col.display({id: 'equivocations', header: OFFENCE_LABEL.Equivocation, meta: num, cell: ({row}) => fmtInt(tally(row.original, 'Equivocation'))}),
                col.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.firstSeenBlock} />}),
                col.display({id: 'session', header: 'Last session', meta: num, cell: ({row}) => (row.original.lastActiveSession != null ? `#${fmtInt(row.original.lastActiveSession)}` : '—')}),
            ]),
        [chain, head, rules]
    )
    return <DataTable columns={columns} rows={rows} getRowId={v => v.id} />
}

const sessionCol = columnsFor<SessionRow>()

// the running session has no end block yet, so it shows how far it has got,
// sized to the text when full
function SessionEnd({s, head, length}: {s: SessionRow; head: number; length: number}) {
    if (s.endBlock != null) return <BlockLink height={s.endBlock} />
    const done = head - s.startBlock + 1
    return (
        <div className="ml-auto grid w-fit whitespace-nowrap">
            <span aria-hidden className="invisible h-0">
                {fmtInt(length)} / {fmtInt(length)}
            </span>
            <span>
                {fmtInt(done)}
                <span className="text-dim"> / {fmtInt(length)}</span>
            </span>
            <Progress value={Math.min(100, (done / length) * 100)} className="mt-1 h-1.5" />
        </div>
    )
}

export function SessionsTable({rows, head, length}: {rows: SessionRow[]; head: number; length: number}) {
    const columns = useMemo(
        () =>
            sessionCol.columns([
                sessionCol.display({id: 'id', header: 'ID', meta: {className: 'w-full', cellClassName: 'font-mono'}, cell: ({row}) => `#${fmtInt(row.original.index)}`}),
                sessionCol.display({id: 'begin', header: 'Block Begin', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.startBlock} />}),
                sessionCol.display({id: 'end', header: 'Block End', meta: {align: 'right'}, cell: ({row}) => <SessionEnd s={row.original} head={head} length={length} />}),
                sessionCol.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
                sessionCol.display({id: 'validators', header: 'Validators', meta: num, cell: ({row}) => fmtInt(row.original.validatorCount)}),
                sessionCol.display({id: 'offline', header: 'Offline', meta: num, cell: ({row}) => fmtInt(row.original.offline)}),
                sessionCol.display({id: 'equivocations', header: 'Equivocations', meta: num, cell: ({row}) => fmtInt(row.original.equivocations)}),
                sessionCol.display({id: 'kicked', header: 'Kicked', meta: num, cell: ({row}) => fmtInt(row.original.kicked)}),
            ]),
        [head, length]
    )
    return <DataTable columns={columns} rows={rows} getRowId={s => String(s.index)} />
}
