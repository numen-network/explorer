import Link from 'next/link'
import AddressText from '@/components/AddressText'
import PairBadge from '@/components/PairBadge'
import {SplitRow, SplitRows} from '@/components/SplitRows'
import TokenIcon from '@/components/TokenIcon'
import {fmtBalance} from '@/lib/format'
import type {HoldingRow} from '@/lib/gql'

export default function HoldingsList({rows}: {rows: HoldingRow[]}) {
    return (
        <SplitRows>
            {rows.map(h => (
                <SplitRow
                    key={h.token.id}
                    lead={
                        <>
                            <Link href={`/token/${h.token.id}`} className="font-medium text-primary hover:underline">
                                <TokenIcon addr={h.token.id} />
                                {h.token.name ?? <AddressText addr={h.token.id} />}
                            </Link>
                            <span className="text-xs text-muted-foreground">{h.token.symbol}</span>
                            <PairBadge token={h.token} />
                        </>
                    }
                >
                    <span className="font-mono">{fmtBalance(h.balance, h.token.decimals ?? 0, h.token.symbol ?? undefined)}</span>
                </SplitRow>
            ))}
        </SplitRows>
    )
}
