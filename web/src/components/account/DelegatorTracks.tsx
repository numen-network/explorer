import {Card} from '@/components/ui/card'
import {trackLabel} from '@/lib/format'
import type {Delegate} from '@/lib/gql'
import {DelegateTile} from './DelegateTile'
import {DelegatorTracksTable} from './DelegatorTracksTable'
import {tabHref, type TabCtx} from './shared'

export default function DelegatorTracks({addr, chain, delegate}: TabCtx & {delegate: Delegate}) {
    const rows = delegate.trackTotals.map(t => ({id: t.track.id, name: trackLabel(t.track.name), delegators: t.delegators, capital: t.capital, votes: t.votes, href: tabHref(addr, 'delegators', {dtrack: t.track.id})}))
    return (
        <>
            <DelegateTile delegate={delegate} chain={chain} />
            <Card size="flush">
                <DelegatorTracksTable rows={rows} chain={chain} />
            </Card>
        </>
    )
}
