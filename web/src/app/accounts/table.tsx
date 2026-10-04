'use client'

import {useMemo} from 'react'
import AccountLink from '@/components/AccountLink'
import Balance from '@/components/Balance'
import {columnsFor, DataTable} from '@/components/DataTable'
import {BlockLink} from '@/components/links'
import {Tip} from '@/components/Tip'
import type {ChainProps} from '@/lib/chain'
import {fmtInt, fmtPct} from '@/lib/format'
import type {AccountListRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const TIERS: [min: number, emoji: string][] = [
    [0.1, '\u{1F40B}'],
    [0.01, '\u{1F988}'],
    [0.001, '\u{1F42C}'],
    [0.0001, '\u{1F41F}'],
    [0.00001, '\u{1F980}'],
    [0.000001, '\u{1F990}'],
]

const tier = (pct: number) => TIERS.find(([min]) => pct >= min)?.[1] ?? ''

// a share under a hundredth of a percent keeps six decimals, so the smaller tiers still read apart
const shareDigits = (pct: number) => (pct >= 0.01 ? 2 : 6)

const col = columnsFor<AccountListRow>()

export function AccountsTable({rows, chain, issuance}: {rows: AccountListRow[]; chain: ChainProps; issuance: string}) {
    const columns = useMemo(() => {
        const total = BigInt(issuance)
        const share = (held: bigint) => (total > 0n ? Number((held * 10n ** 12n) / total) / 1e10 : 0)
        return col.columns([
            col.display({id: 'account', header: 'Account', meta: {className: 'w-full'}, cell: ({row}) => <AccountLink full addr={ss58Encode(row.original.id, chain.ss58)} acc={row.original} />}),
            col.display({
                id: 'balance',
                header: 'Balance',
                meta: {align: 'right', cellClassName: 'font-mono'},
                cell: ({row}) => {
                    const held = BigInt(row.original.balance)
                    const pct = share(held)
                    const mark = held > 0n ? tier(pct) : ''
                    return (
                        <Tip text={held > 0n ? `${fmtPct(held, total, shareDigits(pct))} of issuance` : undefined}>
                            <span>
                                {mark && <span className="mr-1.5">{mark}</span>}
                                <Balance planck={held} chain={chain} />
                            </span>
                        </Tip>
                    )
                },
            }),
            col.display({id: 'extrinsics', header: 'Extrinsics', meta: {align: 'right', cellClassName: 'font-mono'}, cell: ({row}) => fmtInt(row.original.nonce)}),
            col.display({id: 'first', header: 'First seen', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.firstSeenBlock} />}),
            col.display({id: 'last', header: 'Last active', meta: {align: 'right'}, cell: ({row}) => <BlockLink height={row.original.lastActiveBlock} />}),
        ])
    }, [chain, issuance])
    return <DataTable columns={columns} rows={rows} getRowId={a => a.id} />
}
