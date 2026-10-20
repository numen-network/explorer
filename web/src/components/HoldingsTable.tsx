'use client'

import {CircleQuestionMark} from 'lucide-react'
import Link from 'next/link'
import Approx from '@/components/Approx'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import HashText from '@/components/HashText'
import {BlockLink, EvmAddrLink} from '@/components/links'
import PairBadge from '@/components/PairBadge'
import ShareBar from '@/components/ShareBar'
import {Tip} from '@/components/Tip'
import TokenIcon from '@/components/TokenIcon'
import {Stat} from '@/components/votes'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {HoldingRow} from '@/lib/gql'

const PERCENTAGE_TIP = 'Number of the token held by this account as compared to the total supply of this token'

const col = columnsFor<HoldingRow>()

const columns = col.columns([
    col.display({
        id: 'token',
        header: 'Token',
        meta: {className: 'w-full'},
        cell: ({row: {original: h}}) => (
            <>
                <Link href={`/token/${h.token.id}`} className="font-medium text-primary hover:underline">
                    <TokenIcon addr={h.token.id} />
                    {h.token.name ?? <HashText hash={h.token.id} />}
                </Link>
                <span className="ml-3 text-xs text-muted-foreground">{h.token.symbol}</span>
                <PairBadge token={h.token} className="ml-3" />
            </>
        ),
    }),
    col.display({id: 'contract', header: 'Contract Address', cell: ({row}) => <EvmAddrLink addr={row.original.token.id} />}),
    col.display({
        id: 'balance',
        header: 'Balance',
        meta: {align: 'right', cellClassName: 'font-mono'},
        cell: ({row: {original: h}}) => fmtBalance(h.balance, h.token.decimals ?? 0, h.token.symbol ?? undefined),
    }),
    col.display({
        id: 'percentage',
        header: () => (
            <>
                Percentage
                <Tip text={PERCENTAGE_TIP}>
                    <CircleQuestionMark aria-label={PERCENTAGE_TIP} className="ml-1 inline size-3 align-[-1px]" />
                </Tip>
            </>
        ),
        meta: {align: 'right'},
        cell: ({row: {original: h}}) => <ShareBar part={h.balance} whole={h.token.totalSupply} />,
    }),
    col.display({id: 'firstIn', header: 'First Transfer-in', meta: {align: 'right'}, cell: ({row: {original: h}}) => (h.firstInBlock == null ? NONE : <BlockLink height={h.firstInBlock} />)}),
    expander(col),
])

function Transfers({h}: {h: HoldingRow}) {
    const amount = (planck: string) => <Approx planck={planck} decimals={h.token.decimals ?? 0} symbol={h.token.symbol ?? undefined} />
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <div className="grid grid-cols-[minmax(0,1fr)] gap-x-10 text-sm sm:grid-cols-2">
                <div>
                    <Stat label="Transfer-in Count" value={fmtInt(h.transferInCount)} />
                    <Stat label="Transfer-in Volume" value={amount(h.transferInVolume)} />
                </div>
                <div className="border-t sm:border-t-0">
                    <Stat label="Transfer-out Count" value={fmtInt(h.transferOutCount)} />
                    <Stat label="Transfer-out Volume" value={amount(h.transferOutVolume)} />
                </div>
            </div>
        </div>
    )
}

export default function HoldingsTable({rows}: {rows: HoldingRow[]}) {
    return <DataTable columns={columns} rows={rows} getRowId={h => h.id} canExpand={() => true} expand={h => <Transfers h={h} />} />
}
