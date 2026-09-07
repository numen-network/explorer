'use client'

import {useMemo} from 'react'
import {columnsFor, DataTable} from '@/components/DataTable'
import {EvmAddrLink} from '@/components/links'
import {Progress} from '@/components/ui/progress'
import {fmtBalance} from '@/lib/format'

export interface Holder {
    id: string
    address: string
    balance: string
}

const hcol = columnsFor<Holder>()

export function HoldersTable({rows, supply, decimals, symbol}: {rows: Holder[]; supply: string; decimals: number; symbol?: string}) {
    const columns = useMemo(() => {
        const total = BigInt(supply)
        return hcol.columns([
            hcol.display({id: 'rank', header: '#', meta: {cellClassName: 'font-mono text-muted-foreground'}, cell: ({row}) => row.index + 1}),
            hcol.display({id: 'address', header: 'Address', meta: {className: 'w-full'}, cell: ({row}) => <EvmAddrLink addr={row.original.address} full />}),
            hcol.display({id: 'balance', header: 'Balance', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtBalance(row.original.balance, decimals, symbol)}),
            hcol.display({
                id: 'share',
                header: 'Share',
                meta: {align: 'right'},
                cell: ({row}) => {
                    const share = total > 0n ? Number((BigInt(row.original.balance) * 10000n) / total) / 100 : 0
                    return (
                        <div className="inline-flex items-center gap-2">
                            <Progress value={Math.min(100, share)} className="h-1.5 w-16" />
                            <span className="w-14 text-right font-mono text-xs text-muted-foreground">{share.toFixed(2)}%</span>
                        </div>
                    )
                },
            }),
        ])
    }, [supply, decimals, symbol])
    return <DataTable columns={columns} rows={rows} getRowId={h => h.id} />
}
