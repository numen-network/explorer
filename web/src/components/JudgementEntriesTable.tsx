'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE, SELF} from '@/components/Detail'
import {emptyText} from '@/components/EmptyList'
import {ExtrinsicLink} from '@/components/links'
import RegistrarSeat from '@/components/RegistrarSeat'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import {JUDGEMENT_TONE} from '@/components/account/shared'
import type {ChainProps} from '@/lib/chain'
import type {JudgementEntryRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<JudgementEntryRow>()

// a seat lists every account it judges now with the verdict, the pending list
// holds only FeePaid entries and names the seat each one waits on
export function JudgementEntriesTable({rows, chain, hex, pending = false}: {rows: JudgementEntryRow[]; chain: ChainProps; hex?: string; pending?: boolean}) {
    const columns = useMemo(() => {
        const account = (acc: JudgementEntryRow['account']) => (acc.id === hex ? SELF : <AccountLink addr={ss58Encode(acc.id, chain.ss58)} acc={acc} />)
        return col.columns([
            col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => (row.original.event.extrinsic ? <ExtrinsicLink id={row.original.event.extrinsic.id} /> : NONE)}),
            col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            col.display({id: 'account', header: pending ? 'Applicant' : 'Account', meta: {className: pending ? undefined : 'w-full'}, cell: ({row}) => account(row.original.account)}),
            pending
                ? col.display({
                      id: 'registrar',
                      header: 'Registrar',
                      meta: {className: 'w-full'},
                      cell: ({row: {original: e}}) => <RegistrarSeat index={e.registrar.index} account={e.registrar.account} ss58={chain.ss58} />,
                  })
                : col.display({id: 'judgement', header: 'Judgement', cell: ({row}) => <Badge variant={JUDGEMENT_TONE[row.original.kind] ?? 'idle'}>{row.original.kind}</Badge>}),
            col.display({
                id: 'fee',
                header: 'Fee',
                meta: {align: 'right'},
                cell: ({row}) => (row.original.fee != null ? <Approx planck={row.original.fee} decimals={chain.decimals} symbol={chain.symbol} /> : NONE),
            }),
        ])
    }, [chain, hex, pending])
    return <DataTable columns={columns} rows={rows} empty={emptyText(pending ? 'pending judgement requests' : 'judgements')} emptyClassName="py-5" getRowId={e => e.id} />
}
