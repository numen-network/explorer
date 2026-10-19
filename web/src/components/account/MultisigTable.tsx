'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtInt, shortHash} from '@/lib/format'
import type {AccountRef, MultisigOpRow, MultisigSide} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {variantName} from '@/lib/variant'
import {SELF} from '@/components/Detail'

const col = columnsFor<MultisigOpRow>()

const isOpen = (o: MultisigOpRow) => o.status === 'NewMultisig' || o.status === 'MultisigApproval'

function Status({op}: {op: MultisigOpRow}) {
    const failed = variantName(op.result) === 'Err'
    const executed = op.status === 'MultisigExecuted'
    return (
        <Badge variant={executed ? (failed ? 'neg' : 'pos') : isOpen(op) ? 'warn' : 'idle'}>
            {executed ? (failed ? 'Exec failed' : 'Executed') : isOpen(op) ? 'Pending' : 'Cancelled'}
        </Badge>
    )
}

function Signed({op, hex}: {op: MultisigOpRow; hex: string}) {
    if (op.approvals.includes(hex)) return <Badge variant="pos">Signed</Badge>
    return isOpen(op) ? <Badge variant="warn">Not yet</Badge> : <Badge variant="idle">Not signed</Badge>
}

export function MultisigTable({rows, side, hex, chain}: {rows: MultisigOpRow[]; side: MultisigSide; hex: string; chain: ChainProps}) {
    const columns = useMemo(() => {
        const account = (acc: AccountRef) => (acc.id === hex ? SELF : <AccountLink addr={ss58Encode(acc.id, chain.ss58)} acc={acc} />)
        const signatory = side === 'signatory'
        return col.columns([
            col.display({id: 'when', header: 'When', cell: ({row}) => <BlockLink height={row.original.createdBlock} />}),
            ...(signatory ? [col.display({id: 'multisig', header: 'Multisig address', meta: {className: 'w-1/2'}, cell: ({row}) => account(row.original.multisig)})] : []),
            col.display({id: 'hash', header: 'Call hash', meta: {cellClassName: 'font-mono text-[13px]'}, cell: ({row}) => shortHash(row.original.callHash)}),
            col.display({
                id: 'approving',
                header: 'Approving',
                meta: {cellClassName: 'font-mono'},
                cell: ({row}) => `${fmtInt(row.original.approvals.length)} / ${fmtInt(row.original.threshold)}`,
            }),
            ...(signatory ? [col.display({id: 'signed', header: 'Signed', cell: ({row}) => <Signed op={row.original} hex={hex} />})] : []),
            col.display({id: 'signatories', header: 'Signatories', meta: {cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.signatories.length)}),
            col.display({id: 'opened', header: 'Opened by', meta: {className: signatory ? 'w-1/2' : 'w-full'}, cell: ({row}) => account(row.original.depositor)}),
            col.display({id: 'status', header: 'Status', meta: {align: 'right'}, cell: ({row}) => <Status op={row.original} />}),
        ])
    }, [side, hex, chain])
    return <DataTable columns={columns} rows={rows} getRowId={o => o.id} />
}
