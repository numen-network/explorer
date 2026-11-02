'use client'

import {useMemo} from 'react'
import {FileText} from 'lucide-react'
import {cn} from 'cn'
import {PARTICIPATION_DAYS} from '@/components/account/shared'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {ArgsTable} from '@/components/ArgsTable'
import {RefCell} from '@/components/bounties'
import {TextDialog} from '@/components/ClampedText'
import CopyBtn from '@/components/CopyBtn'
import {columnsFor, DataTable, expander} from '@/components/DataTable'
import DownloadBtn from '@/components/DownloadBtn'
import {emptyText} from '@/components/EmptyList'
import HashText from '@/components/HashText'
import {INLINE_ICON_BUTTON} from '@/components/inlineIconButton'
import {BlockLink} from '@/components/links'
import RefList from '@/components/RefList'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import type {ArgNode} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import {camelLabel, fmtBalance, fmtCount, fmtInt, fmtPct, fmtSpan, trackLabel} from '@/lib/format'
import type {DelegateRow, PreimageRow, TrackRow, TreasurySpendRow, VoterRow} from '@/lib/gql'
import {SPEND_KIND_LABEL, SPEND_TONE} from '@/lib/spends'
import {ss58Encode} from '@/lib/ss58'

const scol = columnsFor<TreasurySpendRow>()

export function TreasuryTable({rows, chain, filtered}: {rows: TreasurySpendRow[]; chain: ChainProps; filtered?: boolean}) {
    const columns = useMemo(
        () =>
            scol.columns([
                scol.display({id: 'id', header: 'Id', meta: {cellClassName: 'font-mono text-xs'}, cell: ({row}) => `#${row.original.id.split('-')[1]}`}),
                scol.display({id: 'kind', header: 'Kind', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => SPEND_KIND_LABEL[row.original.kind] ?? row.original.kind}),
                scol.display({
                    id: 'beneficiary',
                    header: 'Beneficiary', meta: {className: 'w-full'},
                    cell: ({row}) => <AccountLink addr={ss58Encode(row.original.beneficiary.id, chain.ss58)} acc={row.original.beneficiary} />,
                }),
                scol.display({id: 'referendum', header: 'Referendum', cell: ({row}) => <RefCell r={row.original.referendum} />}),
                scol.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => <Badge variant={SPEND_TONE[row.original.status] ?? 'idle'}>{camelLabel(row.original.status)}</Badge>,
                }),
                scol.display({id: 'amount', header: 'Amount', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.amount, chain.decimals, chain.symbol)}),
                scol.display({id: 'block', header: 'Block', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.block} />}),
            ]),
        [chain]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('spends', filtered)} getRowId={s => s.id} />
}

const tcol = columnsFor<TrackRow>()
const num = {align: 'right', cellClassName: 'font-mono'} as const

export function TracksTable({rows, chain}: {rows: TrackRow[]; chain: ChainProps}) {
    const columns = useMemo(() => {
        // periods are stored in blocks, the block count stays on hover
        const span = (blocks: number) => (
            <Tip text={fmtCount(blocks, 'block')}>
                <span>{fmtSpan(blocks * chain.blockTime)}</span>
            </Tip>
        )
        return tcol.columns([
            tcol.display({id: 'track', header: 'Track', meta: {className: 'w-full', cellClassName: 'text-[13px] font-medium'}, cell: ({row}) => trackLabel(row.original.name)}),
            tcol.display({id: 'spend', header: 'Max spend', meta: num, cell: ({row}) => (row.original.maxSpend ? fmtBalance(row.original.maxSpend, chain.decimals, chain.symbol) : '—')}),
            tcol.display({id: 'deciding', header: 'Max deciding', meta: num, cell: ({row}) => fmtInt(row.original.maxDeciding)}),
            tcol.display({id: 'submission', header: 'Submission deposit', meta: num, cell: () => fmtBalance(chain.submissionDeposit, chain.decimals, chain.symbol)}),
            tcol.display({id: 'deposit', header: 'Decision deposit', meta: num, cell: ({row}) => fmtBalance(row.original.decisionDeposit, chain.decimals, chain.symbol)}),
            tcol.display({id: 'prepare', header: 'Prepare', meta: num, cell: ({row}) => span(row.original.preparePeriod)}),
            tcol.display({id: 'decision', header: 'Decision', meta: num, cell: ({row}) => span(row.original.decisionPeriod)}),
            tcol.display({id: 'confirm', header: 'Confirm', meta: num, cell: ({row}) => span(row.original.confirmPeriod)}),
            tcol.display({id: 'enactment', header: 'Min enactment', meta: num, cell: ({row}) => span(row.original.minEnactmentPeriod)}),
        ])
    }, [chain])
    return <DataTable columns={columns} rows={rows} getRowId={t => t.id} />
}

const vcol = columnsFor<VoterRow>()

export function VotersTable({rows, chain}: {rows: VoterRow[]; chain: ChainProps}) {
    const columns = useMemo(() => {
        const votes = (planck: string) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} />
        return vcol.columns([
            vcol.display({id: 'voter', header: 'Voter', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original} />}),
            vcol.display({id: 'last', header: 'Last vote', cell: ({row}) => <RefCell r={row.original.lastVote} />}),
            vcol.display({id: 'referenda', header: 'Referenda', meta: num, cell: ({row}) => fmtInt(row.original.directReferenda + row.original.delegatedReferenda)}),
            vcol.display({id: 'participation', header: `Participation (${PARTICIPATION_DAYS}d)`, meta: num, cell: ({row}) => (row.original.open > 0 ? fmtPct(row.original.voted, row.original.open) : '—')}),
            vcol.display({id: 'direct', header: 'Direct votes', meta: num, cell: ({row}) => votes(row.original.ownVotes)}),
            vcol.display({id: 'received', header: 'Received votes', meta: num, cell: ({row}) => votes(row.original.receivedVotes)}),
            vcol.display({id: 'delegated', header: 'Delegated votes', meta: num, cell: ({row}) => votes(row.original.delegatedVotes)}),
        ])
    }, [chain])
    return <DataTable columns={columns} rows={rows} empty={emptyText('voters')} getRowId={v => v.id} />
}

const dcol = columnsFor<DelegateRow>()

export function DelegatesTable({rows, chain, referenda}: {rows: DelegateRow[]; chain: ChainProps; referenda: number}) {
    const columns = useMemo(
        () =>
            dcol.columns([
                dcol.display({id: 'delegate', header: 'Delegate', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original.account} />}),
                dcol.display({id: 'delegators', header: 'Delegators', meta: num, cell: ({row}) => fmtInt(row.original.delegators)}),
                dcol.display({id: 'tracks', header: 'Tracks', meta: num, cell: ({row}) => fmtInt(row.original.tracks)}),
                dcol.display({id: 'delegated', header: 'Received', meta: num, cell: ({row}) => fmtBalance(row.original.delegated, chain.decimals, chain.symbol)}),
                dcol.display({id: 'voted', header: 'Voted', meta: num, cell: ({row}) => `${fmtInt(row.original.voted)} / ${fmtInt(referenda)}`}),
            ]),
        [chain, referenda]
    )
    return <DataTable columns={columns} rows={rows} empty={emptyText('delegates')} getRowId={d => d.id} />
}

export type PreimageView = Omit<PreimageRow, 'bytes' | 'calls'> & {call: string | null; raw: string | null; view: ArgNode | null; text: {text: string; full?: string} | null; download: string | null}

const pcol = columnsFor<PreimageView>()

const PREIMAGE_TONE = {Requested: 'pos', Unrequested: 'primary', Cleared: 'idle'} as const

// the same text set twice on one referendum is one reference
function preimageRefs({metadataActions, referenda}: PreimageView) {
    const texts = new Map(metadataActions.map(a => [a.referendum.index, a.referendum.title]))
    const refs = [...texts].map(([index, title]) => ({index, title, href: `/referendum/${index}?tab=text`}))
    return [...refs, ...referenda.map(({index, title}) => ({index, title, href: `/referendum/${index}?tab=call`}))].sort((a, b) => a.index - b.index)
}

// its buttons sit in a row that expands, clicks stop here
function PreimageContent({row}: {row: PreimageView}) {
    return (
        <span className="inline-flex items-center" onClick={e => e.stopPropagation()}>
            {row.call || row.raw ? <span className="font-mono text-[13px]">{row.call ?? row.raw}</span> : row.title ? <span className="block max-w-22 truncate text-[13px] 2xl:max-w-96">{row.title}</span> : '—'}
            {row.text && (
                <TextDialog
                    {...row.text}
                    trigger={
                        <Button variant="outline" size="icon-xs" aria-label="View text" className={cn(INLINE_ICON_BUTTON, 'ml-1.5')}>
                            <FileText className="size-2.5" />
                        </Button>
                    }
                />
            )}
            {row.download && <DownloadBtn href={row.download} />}
        </span>
    )
}

export function PreimagesTable({rows, chain}: {rows: PreimageView[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            pcol.columns([
                pcol.display({
                    id: 'hash',
                    header: 'Hash',
                    meta: {cellClassName: 'font-mono text-xs'},
                    cell: ({row}) => (
                        <span className="inline-flex items-center" onClick={e => e.stopPropagation()}>
                            <HashText hash={row.original.hash} />
                            <CopyBtn text={row.original.hash} />
                        </span>
                    ),
                }),
                pcol.display({id: 'type', header: 'Type', meta: {cellClassName: 'text-[13px]'}, cell: ({row}) => row.original.kind ?? '—'}),
                pcol.display({id: 'content', header: 'Content', meta: {className: 'w-full'}, cell: ({row}) => <PreimageContent row={row.original} />}),
                pcol.display({id: 'referenda', header: 'Referenda', cell: ({row}) => <RefList refs={preimageRefs(row.original)} />}),
                pcol.display({
                    id: 'status',
                    header: 'Status',
                    cell: ({row}) => <Badge variant={PREIMAGE_TONE[row.original.status as keyof typeof PREIMAGE_TONE] ?? 'idle'}>{row.original.status}</Badge>,
                }),
                pcol.display({id: 'size', header: 'Size', meta: num, cell: ({row}) => (row.original.len == null ? '—' : fmtCount(row.original.len, 'byte'))}),
                pcol.display({
                    id: 'depositor',
                    header: 'Depositor',
                    cell: ({row}) => (row.original.depositor ? <AccountLink addr={ss58Encode(row.original.depositor.id, chain.ss58)} acc={row.original.depositor} /> : '—'),
                }),
                pcol.display({id: 'deposit', header: 'Deposit', meta: num, cell: ({row}) => (row.original.deposit == null ? '—' : <Approx planck={row.original.deposit} decimals={chain.decimals} symbol={chain.symbol} />)}),
                pcol.display({id: 'noted', header: 'Noted', meta: {align: 'right'}, cell: ({row}) => (row.original.notedBlock == null ? '—' : <BlockLink height={row.original.notedBlock} />)}),
                pcol.display({id: 'cleared', header: 'Cleared', meta: {align: 'right'}, cell: ({row}) => (row.original.clearedBlock == null ? '—' : <BlockLink height={row.original.clearedBlock} />)}),
                expander(pcol),
            ]),
        [chain]
    )
    return (
        <DataTable
            columns={columns}
            rows={rows}
            empty={emptyText('preimages')}
            getRowId={p => p.id}
            canExpand={p => p.view != null}
            expand={p => (
                <div className="px-5 py-3">
                    <ArgsTable node={p.view!} chain={chain} />
                </div>
            )}
        />
    )
}
