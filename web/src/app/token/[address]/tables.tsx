'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {EvmAddrLink} from '@/components/links'
import {Progress} from '@/components/ui/progress'
import {fmtBalance, fmtPct, pctToNum} from '@/lib/format'

export interface Holder {
    id: string
    address: string
    balance: string
}

const hcol = columnsFor<Holder>()

export function HoldersTable({rows, offset, supply, decimals, symbol}: {rows: Holder[]; offset: number; supply: string | null; decimals: number; symbol?: string}) {
    const columns = useMemo(() => {
        const total = BigInt(supply ?? 0)
        return hcol.columns([
            hcol.display({id: 'rank', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => offset + row.index + 1}),
            hcol.display({id: 'address', header: 'Address', meta: {className: 'w-full'}, cell: ({row}) => <EvmAddrLink addr={row.original.address} full />}),
            hcol.display({id: 'balance', header: 'Balance', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.balance, decimals, symbol)}),
            hcol.display({
                id: 'share',
                header: 'Share',
                meta: {align: 'right'},
                cell: ({row}) => {
                    const share = pctToNum(BigInt(row.original.balance), total)
                    return (
                        <div className="inline-flex items-center gap-2">
                            <Progress value={Math.min(100, share)} className="h-1.5 w-16" />
                            <span className="w-14 text-right font-mono text-xs text-muted-foreground">{fmtPct(row.original.balance, supply)}</span>
                        </div>
                    )
                },
            }),
        ])
    }, [offset, supply, decimals, symbol])
    return <DataTable columns={columns} rows={rows} getRowId={h => h.id} />
}
