import Approx from '@/components/Approx'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {fmtInt} from '@/lib/format'
import {delegationsOutFor} from '@/lib/gql'
import {DelegationsTable} from './DelegationsTable'
import type {TabCtx} from './shared'

export default async function Delegations({hex, chain}: TabCtx) {
    const {delegations} = await delegationsOutFor(hex)
    // one delegation per track, and the conviction locks overlap, so the largest is what the account has put up
    const delegated = delegations.reduce((m, d) => (BigInt(d.balance) > m ? BigInt(d.balance) : m), 0n)
    return (
        <>
            <StatTile
                label="Tracks"
                value={fmtInt(delegations.length)}
                beside={[{label: 'Delegated', value: <Approx planck={delegated} decimals={chain.decimals} symbol={chain.symbol} breakable />}]}
                pairs
                className="mb-3"
            />
            <Card size="flush">
                <DelegationsTable label="Delegating to" rows={delegations} chain={chain} />
            </Card>
        </>
    )
}
