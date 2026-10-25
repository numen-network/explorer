'use client'

import {useMemo} from 'react'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import RegistrarSeat from '@/components/RegistrarSeat'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import type {RegistrarRow} from '@/lib/gql'
import type {IdentityJudgement} from '@/lib/identity'
import {JUDGEMENT_TONE} from './shared'

export type ReceivedJudgement = IdentityJudgement & {seat?: RegistrarRow}

const col = columnsFor<ReceivedJudgement>()

export function ReceivedJudgementsTable({rows, chain}: {rows: ReceivedJudgement[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'registrar',
                    header: 'Registrar',
                    meta: {className: 'w-full'},
                    cell: ({row: {original: j}}) => <RegistrarSeat index={j.registrar} account={j.seat ? j.seat.account : undefined} ss58={chain.ss58} />,
                }),
                col.display({id: 'judgement', header: 'Judgement', cell: ({row}) => <Badge variant={JUDGEMENT_TONE[row.original.kind] ?? 'idle'}>{row.original.kind}</Badge>}),
                col.display({id: 'fee', header: 'Reserved fee', meta: {align: 'right'}, cell: ({row}) => (row.original.fee ? <Approx planck={row.original.fee} decimals={chain.decimals} symbol={chain.symbol} /> : NONE)}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={j => String(j.registrar)} />
}
