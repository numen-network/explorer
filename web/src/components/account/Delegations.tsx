import Approx from '@/components/Approx'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {fmtInt, fmtPct} from '@/lib/format'
import {delegationActivity} from '@/lib/gql'
import {combine, delegatedOf, delegateRows, type Delegation} from './delegates'
import {DelegatesTable} from './DelegatesTable'
import type {TabCtx} from './shared'

export default async function Delegations({hex, addr, chain, delegations}: TabCtx & {delegations: Delegation[]}) {
    const {votes, open} = await delegationActivity(hex, delegations)
    const rows = delegateRows(delegations, votes, open)
    const all = combine(rows)
    return (
        <>
            <StatTile
                label="Delegates"
                value={fmtInt(rows.filter(r => !r.ended).length)}
                beside={[
                    {label: 'Tracks', value: fmtInt(delegations.filter(d => d.end == null).length)},
                    {label: 'Delegated', value: <Approx planck={delegatedOf(delegations)} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                    {label: 'Participation', value: fmtPct(all.voted, all.open)},
                ]}
                pairs
                className="mb-3"
            />
            <Card size="flush">
                <DelegatesTable rows={rows} addr={addr} chain={chain} />
            </Card>
        </>
    )
}
