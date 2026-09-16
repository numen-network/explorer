'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink, EvmAddrLink, EvmTxLink} from '@/components/links'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {evmTxTypeLabel} from '@/lib/evm'
import {fmtBalance} from '@/lib/format'
import type {EvmTxRow} from '@/lib/gql'
import {NONE, SELF} from '@/components/Detail'

const xcol = columnsFor<EvmTxRow>()

export function EvmTxsTable({rows, addr, chain}: {rows: EvmTxRow[]; addr: string; chain: ChainProps}) {
    const columns = useMemo(() => {
        const side = (a: string) => (a === addr ? SELF : <EvmAddrLink addr={a} />)
        return xcol.columns([
            xcol.display({id: 'hash', header: 'Hash', meta: {className: 'w-full'}, cell: ({row}) => <EvmTxLink hash={row.original.id} />}),
            xcol.display({id: 'block', header: 'Block', cell: ({row}) => <BlockLink height={row.original.block.height} />}),
            xcol.display({id: 'time', header: () => <TimeModeButton />, meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => <TimeCell iso={row.original.timestamp} />}),
            xcol.display({id: 'from', header: 'From', cell: ({row}) => side(row.original.from)}),
            xcol.display({
                id: 'to',
                header: 'To',
                cell: ({row}) =>
                    row.original.to ? (
                        side(row.original.to)
                    ) : row.original.contractAddress ? (
                        <span className="text-xs">
                            create → {side(row.original.contractAddress)}
                        </span>
                    ) : (
                        NONE
                    ),
            }),
            xcol.display({id: 'type', header: 'Type', meta: {cellClassName: 'text-xs'}, cell: ({row}) => evmTxTypeLabel(row.original.txType)}),
            xcol.display({id: 'value', header: 'Value', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.value, chain.decimals)}),
            xcol.display({
                id: 'result',
                header: 'Result',
                meta: {align: 'right'},
                cell: ({row}) => <Badge variant={row.original.status === 'Succeed' ? 'pos' : 'neg'}>{row.original.status === 'Succeed' ? 'OK' : row.original.status}</Badge>,
            }),
        ])
    }, [addr, chain])
    return <DataTable columns={columns} rows={rows} empty="No transactions." getRowId={tx => tx.id} />
}
