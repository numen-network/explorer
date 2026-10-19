'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import {columnsFor, DataTable} from '@/components/DataTable'
import {Tip} from '@/components/Tip'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtCount, fmtSpan} from '@/lib/format'
import type {ProxyRow} from '@/lib/gql'
import {PROXY_SCOPE} from '@/lib/proxyTypes'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<ProxyRow>()

function scopeTip(proxyType: string) {
    const scope = PROXY_SCOPE[proxyType]
    return (
        scope && (
            <span className="flex flex-col gap-0.5">
                <span className="text-background/70">{scope.head}</span>
                {scope.calls.map(c => (
                    <span key={c} className="font-mono">
                        {c}
                    </span>
                ))}
            </span>
        )
    )
}

export function ProxiesTable({label, rows, chain}: {label: string; rows: ProxyRow[]; chain: ChainProps}) {
    const columns = useMemo(
        () =>
            col.columns([
                col.display({
                    id: 'other',
                    header: label, meta: {className: 'w-full'},
                    cell: ({row}) => {
                        const other = row.original.delegatee ?? row.original.delegator
                        return other && <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
                    },
                }),
                col.display({
                    id: 'type',
                    header: 'Type',
                    cell: ({row}) => (
                        <Tip text={scopeTip(row.original.proxyType)}>
                            <Badge variant={row.original.proxyType === 'Any' ? 'warn' : 'idle'}>{row.original.proxyType}</Badge>
                        </Tip>
                    ),
                }),
                col.display({
                    id: 'delay',
                    header: 'Delay',
                    meta: {align: 'right'},
                    cell: ({row: {original: {delay}}}) =>
                        delay > 0 ? (
                            <>
                                {fmtCount(delay, 'block')} <span className="text-muted-foreground">≈ {fmtSpan(delay * chain.blockTime)}</span>
                            </>
                        ) : (
                            '—'
                        ),
                }),
            ]),
        [label, chain]
    )
    return <DataTable columns={columns} rows={rows} getRowId={p => p.id} />
}
