import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtInt, trackLabel} from '@/lib/format'
import {delegateTally, delegationsInPage, trackList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {tabHref, type TabCtx} from './shared'

export default async function Received({hex, addr, chain, sp, maxDelegations}: TabCtx & {maxDelegations: bigint}) {
    const pg = paging(sp)
    const [{tracks}, {delegateById: tally}] = await Promise.all([trackList(), delegateTally(hex)])
    const trackIds = tracks.map(t => t.id)
    const track = trackIds.includes(String(sp.dtrack)) ? String(sp.dtrack) : ''
    const dIn = await delegationsInPage(hex, trackIds, track, pg.size, pg.offset)

    const amount = (planck: string | bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />
    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)

    return (
        <>
            {tally && (
                <StatTile
                    label="Tracks"
                    value={fmtInt(tally.tracks)}
                    beside={[
                        {label: 'Delegators', value: fmtInt(tally.delegators)},
                        {label: 'Capital', value: amount(tally.delegated)},
                        {label: 'Max delegations', value: amount(maxDelegations)},
                    ]}
                    pairs
                    className="mb-3"
                />
            )}
            {dIn.all > 0 && (
                <FilterSelect label="Track" className="mb-3" values={trackIds} labelOf={trackName} counts={dIn.perTrack} allCount={dIn.all} value={track} href={t => tabHref(addr, 'received', {dtrack: t})} />
            )}
            <Card size="flush">
                <DelegationsTable label="Delegated from" rows={dIn.rows} chain={chain} filtered={!!track} />
            </Card>
            <Pager paging={pg} total={dIn.total} href={tabHref(addr, 'received', {dtrack: track})} />
        </>
    )
}
