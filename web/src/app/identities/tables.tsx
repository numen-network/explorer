'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import RetiredBadge from '@/components/RetiredBadge'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {RegistrarRow} from '@/lib/gql'
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
