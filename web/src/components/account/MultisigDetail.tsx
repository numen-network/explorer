'use client'

import Link from 'next/link'
import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {CallTree} from '@/components/CallTree'
import {columnsFor, DataTable} from '@/components/DataTable'
import {SELF} from '@/components/Detail'
import {ExtrinsicLink, Jump} from '@/components/links'
import {TimeCell} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ArgNode} from '@/lib/args'
import type {ChainProps} from '@/lib/chain'
import {extrinsicPath, fmtCount} from '@/lib/format'
import type {AccountRef, CallRow, MultisigOpRow, MultisigStep} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {variantName} from '@/lib/variant'

/** What an expanded operation shows past its row, its call tree from the call down. */
export interface MultisigCall {
    calls: (CallRow & {view: ArgNode | null})[]
    total: number
}

export const isOpen = (o: MultisigOpRow) => o.status === 'NewMultisig' || o.status === 'MultisigApproval'

type Action = 'Opened' | 'Approved' | 'Executed' | 'Exec failed' | 'Cancelled' | 'Not yet' | 'Not signed'

const VARIANT = {Opened: 'outline', Approved: 'outline', Executed: 'pos', 'Exec failed': 'neg', Cancelled: 'idle', 'Not yet': 'warn', 'Not signed': 'idle'} as const

function actionOf(step: MultisigStep, op: MultisigOpRow): Action {
    switch (step.name) {
        case 'Multisig.NewMultisig':
            return 'Opened'
        case 'Multisig.MultisigApproval':
            return 'Approved'
        case 'Multisig.MultisigExecuted':
            return variantName(op.result) === 'Err' ? 'Exec failed' : 'Executed'
        default:
            return 'Cancelled'
    }
}

interface Row {
    account: string
    action: Action
    step: MultisigStep | null
}

const col = columnsFor<Row>()

function Approvals({op, hex, accounts, chain}: {op: MultisigOpRow; hex: string; accounts: Record<string, AccountRef>; chain: ChainProps}) {
    const rows: Row[] = [
        ...op.timeline.map(step => ({account: step.account, action: actionOf(step, op), step})),
        ...op.signatories.filter(s => !op.approvals.includes(s)).map(s => ({account: s, action: isOpen(op) ? ('Not yet' as const) : ('Not signed' as const), step: null})),
    ]
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'signatory',
                    header: 'Signatory',
                    meta: {className: 'w-full px-0 py-2 first:pl-0'},
                    cell: ({row}) => (row.original.account === hex ? SELF : <AccountLink addr={ss58Encode(row.original.account, chain.ss58)} acc={accounts[row.original.account] ?? {id: row.original.account, identityDisplay: null}} />),
                }),
                col.display({id: 'action', header: 'Action', meta: {className: 'py-2'}, cell: ({row}) => <Badge variant={VARIANT[row.original.action]}>{row.original.action}</Badge>}),
                col.display({id: 'extrinsic', header: 'Extrinsic', meta: {className: 'py-2'}, cell: ({row}) => (row.original.step?.extrinsic ? <ExtrinsicLink id={row.original.step.extrinsic} /> : <span className="text-dim">—</span>)}),
                col.display({
                    id: 'time',
                    header: 'Time',
                    meta: {align: 'right', className: 'px-0 py-2 last:pr-0'},
                    cell: ({row}) => (row.original.step ? <TimeCell iso={row.original.step.timestamp} cycle /> : <span className="text-dim">—</span>),
                }),
            ]),
        [hex, accounts, chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={r => r.step?.event ?? r.account} className="mt-1" />
}

export function MultisigDetail({op, hex, call, accounts, chain}: {op: MultisigOpRow; hex: string; call: MultisigCall | null; accounts: Record<string, AccountRef>; chain: ChainProps}) {
    // the tree draws depth from the address, which counts from the extrinsic root
    const depth = call?.calls[0]?.address.length ?? 0
    const calls = call?.calls.map(c => ({...c, address: c.address.slice(depth)})) ?? []
    const hidden = (call?.total ?? 0) - calls.length
    return (
        <div className="bg-[#fafaf9] px-5 py-4">
            <h3 className="text-[13px] font-semibold">Approvals</h3>
            <Approvals op={op} hex={hex} accounts={accounts} chain={chain} />
            <h3 className="mt-6 mb-2 text-[13px] font-semibold">Call</h3>
            {call ? <CallTree calls={calls} chain={chain} signer={op.multisig} /> : <div className="text-sm text-muted-foreground">None</div>}
            {hidden > 0 && (
                <Link href={`/extrinsic/${extrinsicPath(op.call!.extrinsic.id)}?tab=calls`} className="mt-2 inline-block text-xs text-primary hover:underline">
                    {fmtCount(hidden, 'more call')} on the extrinsic page <Jump />
                </Link>
            )}
        </div>
    )
}
