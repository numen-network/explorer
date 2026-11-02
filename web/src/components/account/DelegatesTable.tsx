'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import {NONE} from '@/components/Detail'
import {BlockLink} from '@/components/links'
import ShareBar from '@/components/ShareBar'
import type {ChainProps} from '@/lib/chain'
import {convictionLabel} from '@/lib/conviction'
import {fmtBalance, fmtInt, trackLabel} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import type {Activity, DelegateRow, TrackRow} from './delegates'
import {tabHref} from './shared'

// votes cast out of referenda open, linked when there are any
function Referenda({a, href}: {a: Activity; href?: string}) {
    return (
        <>
            {href && a.voted > 0 ? (
                <Link href={href} className="text-primary hover:underline">
                    {fmtInt(a.voted)}
                </Link>
            ) : (
                fmtInt(a.voted)
            )}
            <span className="text-dim"> of {fmtInt(a.open)}</span>
            {a.voted > 0 && (
                <div className="text-xs text-dim">
                    {fmtInt(a.aye)} aye{a.nay > 0 && ` · ${fmtInt(a.nay)} nay`}
                </div>
            )}
        </>
    )
}

const participation = (a: Activity) => (a.open > 0 ? <ShareBar part={String(a.voted)} whole={String(a.open)} /> : NONE)

const cast = (a: Activity, chain: ChainProps) => (a.voted > 0 ? <Approx planck={a.cast} decimals={chain.decimals} symbol={chain.symbol} /> : NONE)

const tcol = columnsFor<TrackRow>()

const faded = (t: TrackRow) => (t.end != null ? 'opacity-50' : undefined)

function TracksPanel({tracks, chain}: {tracks: TrackRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () => [
            tcol.display({id: 'track', header: 'Track', meta: {className: 'w-full px-0 py-2 first:pl-0', cellClassName: 'text-[13px]'}, cell: ({row}) => trackLabel(row.original.track.name)}),
            tcol.display({id: 'conviction', header: 'Conviction', meta: {className: 'py-2', cellClassName: 'font-mono'}, cell: ({row}) => convictionLabel(row.original.conviction)}),
            tcol.display({id: 'capital', header: 'Capital', meta: {align: 'right', className: 'py-2', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.balance, chain.decimals, chain.symbol)}),
            tcol.display({id: 'votes', header: 'Votes', meta: {align: 'right', className: 'py-2', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.votes, chain.decimals, chain.symbol)}),
            tcol.display({id: 'referenda', header: 'Referenda', meta: {align: 'right', className: 'py-2', cellClassName: 'font-mono'}, cell: ({row}) => <Referenda a={row.original} />}),
            tcol.display({id: 'participation', header: 'Participation', meta: {align: 'right', className: 'py-2'}, cell: ({row}) => participation(row.original)}),
            tcol.display({id: 'cast', header: 'Votes cast', meta: {align: 'right', className: 'py-2', cellClassName: 'font-mono'}, cell: ({row}) => cast(row.original, chain)}),
            tcol.display({id: 'since', header: 'Since', meta: {align: 'right', className: 'py-2'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            tcol.display({id: 'until', header: 'Until', meta: {align: 'right', className: 'py-2 last:pr-0'}, cell: ({row}) => (row.original.end == null ? NONE : <BlockLink height={row.original.end} />)}),
        ],
        [chain]
    )
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <h3 className="text-[13px] font-semibold">Tracks</h3>
            <DataTable columns={columns} rows={tracks} getRowId={t => t.id} rowClassName={faded} className="mt-1" />
        </div>
    )
}

const col = columnsFor<DelegateRow>()

export function DelegatesTable({rows, addr, chain}: {rows: DelegateRow[]; addr: string; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'delegate',
                    header: 'Delegate',
                    meta: {className: 'w-full'},
                    cell: ({row}) => (
                        <span className="flex items-center gap-2">
                            <AccountLink addr={ss58Encode(row.original.target.id, chain.ss58)} acc={row.original.target} />
                            {row.original.ended && <span className="text-[11px] text-dim">ended</span>}
                        </span>
                    ),
                }),
                col.display({id: 'tracks', header: 'Tracks', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(new Set(row.original.delegations.map(d => d.track.id)).size)}),
                col.display({id: 'capital', header: 'Capital', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.capital, chain.decimals, chain.symbol)}),
                col.display({
                    id: 'referenda',
                    header: 'Referenda',
                    meta: {align: 'right', cellClassName: 'font-mono'},
                    cell: ({row}) => <Referenda a={row.original} href={tabHref(addr, 'delegated-votes', {delegate: ss58Encode(row.original.target.id, chain.ss58)})} />,
                }),
                col.display({id: 'participation', header: 'Participation', meta: {align: 'right'}, cell: ({row}) => participation(row.original)}),
                col.display({id: 'cast', header: 'Votes cast', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => cast(row.original, chain)}),
                col.display({id: 'last', header: 'Last vote', meta: {align: 'right'}, cell: ({row}) => (row.original.last == null ? NONE : <BlockLink height={row.original.last} />)}),
                col.display({id: 'since', header: 'Since', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.since} />}),
                expander(col),
            ]),
        [addr, chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={d => d.key} canExpand={() => true} expand={d => <TracksPanel tracks={d.delegations} chain={chain} />} rowClassName={d => (d.ended ? 'opacity-50' : undefined)} />
}
