'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import RetiredBadge from '@/components/RetiredBadge'
import Socials from '@/components/Socials'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {IdentityRef} from '@/lib/identity'
import type {IdentityRow, RegistrarRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'

const acc = (row: IdentityRow): IdentityRef => ({identityDisplay: row.identityDisplay, identityJson: row.identityJson})

const icol = columnsFor<IdentityRow>()

// the social icons are the first thing to go when the row cannot hold four
// columns, the account and the sub count are what the page is for
export function IdentitiesTable({rows, ss58}: {rows: IdentityRow[]; ss58: number}) {
    const columns = useMemo(
        () =>
            icol.columns([
                expander(icol, true),
                icol.display({id: 'account', header: 'Account', meta: {className: 'w-full pr-0 pl-3'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.id, ss58)} acc={acc(row.original)} className="min-w-0" />}),
                icol.display({id: 'socials', header: 'Socials', meta: {className: 'hidden min-w-[204px] pr-0 pl-3 sm:table-cell'}, cell: ({row}) => <Socials json={row.original.identityJson} />}),
                icol.display({id: 'subs', header: 'Sub identities', meta: {align: 'right', className: 'min-w-36 pl-3', cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => fmtInt(row.original.subs.length)}),
            ]),
        [ss58]
    )
    return (
        <DataTable
            columns={columns}
            rows={rows}
            empty="No identities yet."
            headClassName="font-normal"
            className="leading-normal"
            getRowId={r => r.id}
            canExpand={r => r.subs.length > 0}
            expand={r => (
                <div className="grid grid-cols-[minmax(0,1fr)] gap-1.5 px-5 pb-3 pl-[3.9rem] text-sm">
                    {r.subs.map(s => (
                        <AccountLink key={s.id} addr={ss58Encode(s.id, ss58)} acc={{identitySubName: s.identitySubName, identitySuper: acc(r)}} className="min-w-0" />
                    ))}
                </div>
            )}
        />
    )
}

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
