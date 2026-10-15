'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import RetiredBadge from '@/components/RetiredBadge'
import {Badge} from '@/components/ui/badge'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {RegistrarRow, UsernameAuthorityRow, UsernameRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

const rcol = columnsFor<RegistrarRow>()

export function RegistrarsTable({rows, chain}: {rows: RegistrarRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            rcol.columns([
                rcol.display({id: 'index', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => `#${row.original.index}`}),
                rcol.display({
                    id: 'registrar',
                    header: 'Registrar', meta: {className: 'w-full'},
                    cell: ({row}) =>
                        row.original.account ? (
                            <AccountLink addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />
                        ) : (
                            <span className="flex items-center gap-2">
                                <RetiredBadge />
                                {row.original.retiredAt != null && <BlockLink height={row.original.retiredAt} />}
                            </span>
                        ),
                }),
                rcol.display({
                    id: 'time',
                    header: () => <TimeModeButton />,
                    meta: {cellClassName: 'text-muted-foreground'},
                    cell: ({row}) => (row.original.lastJudgementAt ? <TimeCell iso={row.original.lastJudgementAt} /> : <span className="text-dim">never</span>),
                }),
                rcol.display({id: 'requests', header: 'Requests received', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.requestCount)}),
                rcol.display({id: 'given', header: 'Judgements given', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.givenCount)}),
                rcol.display({id: 'fee', header: 'Fee', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.fee != null ? fmtBalance(row.original.fee, chain.decimals, chain.symbol) : NONE)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty="No registrars yet." getRowId={r => r.id} />
}

const PROVIDER_LABEL: Record<string, string> = {AuthorityDeposit: 'Deposit'}

const STATUS_BADGE: Record<string, 'pos' | 'idle' | 'warn'> = {Active: 'pos', Pending: 'idle', Unbinding: 'warn'}

const ucol = columnsFor<UsernameRow>()

export function UsernamesTable({rows, chain}: {rows: UsernameRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            ucol.columns([
                ucol.display({
                    id: 'username',
                    header: 'Username',
                    meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <span className="inline-flex items-center gap-2">
                            <span className="font-medium">{row.original.id}</span>
                            {row.original.primary && <Badge variant="primary">Primary</Badge>}
                        </span>
                    ),
                }),
                ucol.display({id: 'account', header: 'Account', cell: ({row}) => <AccountLink addr={ss58Encode(row.original.owner.id, chain.ss58)} acc={row.original.owner} />}),
                ucol.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.grantedAt} />}),
                ucol.display({id: 'status', header: 'Status', cell: ({row}) => <Badge variant={STATUS_BADGE[row.original.status]}>{row.original.status}</Badge>}),
                ucol.display({id: 'expires', header: 'Expires', cell: ({row}) => (row.original.expiresAt != null ? <BlockLink height={row.original.expiresAt} /> : NONE)}),
                ucol.display({id: 'provider', header: 'Provider', cell: ({row}) => PROVIDER_LABEL[row.original.provider] ?? row.original.provider}),
                ucol.display({id: 'deposit', header: 'Deposit', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.deposit != null ? fmtBalance(row.original.deposit, chain.decimals, chain.symbol) : NONE)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty="No usernames yet." getRowId={r => r.id} />
}

const acol = columnsFor<UsernameAuthorityRow>()

export function UsernameAuthoritiesTable({rows, chain}: {rows: UsernameAuthorityRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            acol.columns([
                acol.display({id: 'authority', header: 'Authority', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.account.id, chain.ss58)} acc={row.original.account} />}),
                acol.display({id: 'suffix', header: 'Suffix', meta: {cellClassName: 'font-mono'}, cell: ({row}) => `.${row.original.id}`}),
                acol.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => (row.original.addedAt != null ? <TimeCell iso={row.original.addedAt} /> : NONE)}),
                acol.display({id: 'usernames', header: 'Usernames', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.usernameCount)}),
                acol.display({id: 'allocation', header: 'Allocation left', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.allocation)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty="No authorities yet." getRowId={r => r.id} />
}
