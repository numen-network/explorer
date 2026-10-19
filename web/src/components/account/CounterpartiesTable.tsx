'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {columnsFor, DataTable} from '@/components/DataTable'
import {SELF} from '@/components/Detail'
import {BlockLink, EvmAddrLink} from '@/components/links'
import SortHead from '@/components/SortHead'
import type {CounterpartySort} from '@/lib/actionFilters'
import {fmtInt} from '@/lib/format'
import type {AccountRef, CounterpartyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const col = columnsFor<CounterpartyRow & {rank: number}>()

// an account for the native token, an EVM address for a contract token
export function Party({party, self, ss58}: {party: AccountRef | string; self: string; ss58: number}) {
    if (typeof party === 'string') return party === self ? SELF : <EvmAddrLink addr={party} />
    return party.id === self ? SELF : <AccountLink addr={ss58Encode(party.id, ss58)} acc={party} />
}

export interface CounterpartyAsset {
    decimals: number
    symbol: string
}

export function CounterpartiesTable({rows, first, self, ss58, asset, sort, hrefs}: {rows: CounterpartyRow[]; first: number; self: string; ss58: number; asset: CounterpartyAsset; sort: CounterpartySort; hrefs: Record<CounterpartySort, string>}) {
    const columns = useMemo(() => {
        const heading = (label: string, by: CounterpartySort) => <SortHead label={label} href={hrefs[by]} dir={by === sort ? 'desc' : undefined} />
        const amount = (v: string) => <Approx planck={v} decimals={asset.decimals} symbol={asset.symbol} />
        return col.columns([
            col.display({id: 'rank', header: '#', meta: {cellClassName: 'text-muted-foreground'}, cell: ({row}) => fmtInt(row.original.rank)}),
            col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <Party party={row.original.counterparty} self={self} ss58={ss58} />}),
            col.display({id: 'in-volume', header: () => heading('Transfer-in Volume', 'in-volume'), meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => amount(row.original.amountIn)}),
            col.display({id: 'in-count', header: () => heading('Transfer-in Count', 'in-count'), meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.countIn)}),
            col.display({id: 'out-volume', header: () => heading('Transfer-out Volume', 'out-volume'), meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => amount(row.original.amountOut)}),
            col.display({id: 'out-count', header: () => heading('Transfer-out Count', 'out-count'), meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.countOut)}),
            col.display({id: 'first', header: 'First', cell: ({row}) => <BlockLink height={row.original.firstBlock} />}),
            col.display({id: 'last', header: 'Last', cell: ({row}) => <BlockLink height={row.original.lastBlock} />}),
        ])
    }, [self, ss58, asset, sort, hrefs])
    const ranked = useMemo(() => rows.map((r, i) => ({...r, rank: first + i})), [rows, first])
    return <DataTable empty="No counterparties yet." emptyClassName="py-5" columns={columns} rows={ranked} getRowId={r => r.id} />
}
