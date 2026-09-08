'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import type {JudgementRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'
import {JUDGEMENT_TONE} from './shared'

const col = columnsFor<JudgementRow>()

export function JudgementsTable({rows, chain}: {rows: JudgementRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.target.id, chain.ss58)} acc={row.original.target} />}),
                col.display({
                    id: 'judgement',
                    header: 'Judgement',
                    cell: ({row}) => (row.original.kind ? <Badge variant={JUDGEMENT_TONE[row.original.kind] ?? 'idle'}>{row.original.kind}</Badge> : NONE),
                }),
                col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block} />}),
                col.display({id: 'time', header: () => <TimeModeButton />, meta: {align: 'right', cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            ]),
        [chain]
    )
    return <DataTable emptyClassName="py-5" columns={columns} rows={rows} getRowId={j => j.id} />
}
