import Approx from '@/components/Approx'
import StatTile from '@/components/StatTile'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {Delegate} from '@/lib/gql'

export function DelegateTile({delegate, chain}: {delegate: Delegate; chain: ChainProps}) {
    const amount = (planck: string | bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />
    return (
        <StatTile
            label="Tracks"
            value={fmtInt(delegate.tracks)}
            beside={[
                {label: 'Delegators', value: fmtInt(delegate.delegators)},
                {label: 'Capital', value: amount(delegate.delegated)},
                {label: 'Max delegations', value: amount(delegate.maxTrackVotes)},
            ]}
            pairs
            className="mb-3"
        />
    )
}
