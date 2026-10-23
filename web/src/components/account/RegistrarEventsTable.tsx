'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {NONE, SELF} from '@/components/Detail'
import {emptyText} from '@/components/EmptyList'
import {ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import type {AccountRef, SeatEventRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {JUDGEMENT_TONE} from './shared'

export type SeatEvent = SeatEventRow & {who: string; acc?: AccountRef; judgement: string | null}

const col = columnsFor<SeatEvent>()

export function RegistrarEventsTable({rows, hex, chain}: {rows: SeatEvent[]; hex: string; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => (row.original.extrinsic ? <ExtrinsicLink id={row.original.extrinsic.id} /> : NONE)}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.block.timestamp} />}),
                col.display({id: 'action', header: 'Action', cell: ({row}) => <Badge variant="primary" className="font-mono">{row.original.method}</Badge>}),
                col.display({
                    id: 'account',
                    header: 'Account',
                    cell: ({row: {original: e}}) => (e.who === hex ? SELF : <AccountLink addr={ss58Encode(e.who, chain.ss58)} acc={e.acc} />),
                }),
                col.display({
                    id: 'judgement',
                    header: 'Judgement',
                    meta: {className: 'w-full'},
                    cell: ({row: {original: e}}) => (e.judgement ? <Badge variant={JUDGEMENT_TONE[e.judgement] ?? 'idle'}>{e.judgement}</Badge> : NONE),
                }),
            ]),
        [hex, chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('requests or judgements')} emptyClassName="py-5" getRowId={e => e.id} />
}
