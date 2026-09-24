'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {CallCell} from '@/components/calls'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {CallRef, ExtrinsicRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<ExtrinsicRow>()

export type ExtrinsicsView = 'list' | 'block' | 'account'

// the block page already names the block and the account page the signer,
// so each view drops the column that would only repeat its heading
const VIEW: Record<ExtrinsicsView, string[]> = {
    list: ['extrinsic', 'block', 'time', 'call', 'signer', 'result', 'fee', 'tip'],
    block: ['extrinsic', 'call', 'signer', 'result', 'fee', 'tip'],
    account: ['extrinsic', 'block', 'time', 'call', 'result'],
}

export function ExtrinsicsTable({rows, leaves, chain, view, empty}: {rows: ExtrinsicRow[]; leaves: Record<string, CallRef[]>; chain: ChainProps; view: ExtrinsicsView; empty?: string}) {
    const columns = useMemo(() => {
        const all = {
            extrinsic: col.display({id: 'extrinsic', header: 'Extrinsic', cell: ({row}) => <ExtrinsicLink id={row.original.id} />}),
            block: col.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block.height} />}),
            time: col.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.block.timestamp} />}),
            call: col.display({id: 'call', header: 'Call', meta: view === 'account' ? {className: 'w-full'} : undefined, cell: ({row}) => <CallCell call={row.original} leaves={leaves[row.original.id]} />}),
            signer: col.display({
                id: 'signer',
                header: 'Signer', meta: {className: 'w-full'},
                cell: ({row}) => (row.original.signer ? <AccountLink addr={ss58Encode(row.original.signer.id, chain.ss58)} acc={row.original.signer} /> : <span className="text-dim">unsigned</span>),
            }),
            result: col.display({
                id: 'result',
                header: 'Result',
                meta: view === 'account' ? {align: 'right'} : undefined,
                cell: ({row}) => <Badge variant={row.original.success ? 'pos' : 'neg'}>{row.original.success ? 'Success' : 'Failed'}</Badge>,
            }),
            fee: col.display({id: 'fee', header: 'Fee', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.fee ? fmtBalance(row.original.fee, chain.decimals) : '—')}),
            tip: col.display({id: 'tip', header: 'Tip', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => (row.original.tip && row.original.tip !== '0' ? fmtBalance(row.original.tip, chain.decimals) : '—')}),
        }
        return col.columns(VIEW[view].map(k => all[k as keyof typeof all]))
    }, [leaves, chain, view])
    return <DataTable columns={columns} rows={rows} empty={empty} emptyClassName={view === 'account' ? 'py-5' : undefined} getRowId={x => x.id} />
}
