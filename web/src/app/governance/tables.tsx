'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {RefCell} from '@/components/bounties'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtBlockSpan, fmtInt} from '@/lib/format'
import type {TrackRow, TreasurySpendRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const trackLabel = (name: string) => name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

const scol = columnsFor<TreasurySpendRow>()

export function TreasuryTable({rows, chain}: {rows: TreasurySpendRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            scol.columns([
                scol.display({id: 'id', header: 'Id', meta: {cellClassName: 'font-mono text-xs'}, cell: ({row}) => `#${row.original.id.split('-')[1]}`}),
                scol.display({id: 'kind', header: 'Kind', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => row.original.kind}),
                scol.display({
                    id: 'beneficiary',
                    header: 'Beneficiary', meta: {className: 'w-full'},
                    cell: ({row}) => (row.original.beneficiary ? <AccountLink addr={ss58Encode(row.original.beneficiary.id, chain.ss58)} acc={row.original.beneficiary} /> : <span className="text-dim">—</span>),
                }),
                scol.display({id: 'referendum', header: 'Referendum', cell: ({row}) => <RefCell r={row.original.referendum} />}),
                scol.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => <Badge variant={row.original.status === 'paid' ? 'pos' : row.original.status === 'approved' ? 'warn' : 'idle'}>{row.original.status}</Badge>,
                }),
                scol.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                scol.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty="No spends yet." getRowId={s => s.id} />
}

const tcol = columnsFor<TrackRow>()
const num = {align: 'right', cellClassName: 'font-mono'} as const

export function TracksTable({rows, chain}: {rows: TrackRow[]; chain: ChainProps}) {
    const columns = useMemo(() => {
        // periods are stored in blocks, the block count stays on hover
        const span = (blocks: number) => (
            <Tip text={`${fmtInt(blocks)} blocks`}>
                <span>{fmtBlockSpan(blocks, chain.blockTime)}</span>
            </Tip>
        )
        return tcol.columns([
            tcol.display({id: 'track', header: 'Track', meta: {className: 'w-full', cellClassName: 'text-[13px] font-medium'}, cell: ({row}) => trackLabel(row.original.name)}),
            tcol.display({id: 'spend', header: 'Max spend', meta: num, cell: ({row}) => fmtBalance(row.original.maxSpend, chain.decimals, chain.symbol)}),
            tcol.display({id: 'deciding', header: 'Max deciding', meta: num, cell: ({row}) => row.original.maxDeciding}),
            tcol.display({id: 'deposit', header: 'Decision deposit', meta: num, cell: ({row}) => fmtBalance(row.original.decisionDeposit, chain.decimals, chain.symbol)}),
            tcol.display({id: 'prepare', header: 'Prepare', meta: num, cell: ({row}) => span(row.original.preparePeriod)}),
            tcol.display({id: 'decision', header: 'Decision', meta: num, cell: ({row}) => span(row.original.decisionPeriod)}),
            tcol.display({id: 'confirm', header: 'Confirm', meta: num, cell: ({row}) => span(row.original.confirmPeriod)}),
            tcol.display({id: 'enactment', header: 'Min enactment', meta: num, cell: ({row}) => span(row.original.minEnactmentPeriod)}),
        ])
    }, [chain])
    return <DataTable columns={columns} rows={rows} getRowId={t => t.id} />
}
