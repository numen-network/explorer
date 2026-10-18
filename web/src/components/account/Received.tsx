import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtInt, trackLabel} from '@/lib/format'
import {weigh} from '@/lib/conviction'
import {delegateTally, delegationsInPage, trackList, type AccountSummary} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {ReceivedTracksTable, type ReceivedTrackRow} from './ReceivedTracksTable'
import {tabHref, type TabCtx} from './shared'

// a delegator holds one delegation per track, so the rows on a track count its delegators
function perTrack(delegations: AccountSummary['delegationsIn'], tracks: {id: string; name: string}[], picked: string, hrefOf: (track: string) => string): ReceivedTrackRow[] {
    return tracks.flatMap(t => {
        const on = delegations.filter(d => d.track.id === t.id)
        if (on.length === 0) return []
        const sum = (f: (d: (typeof on)[number]) => bigint) => on.reduce((n, d) => n + f(d), 0n).toString()
        return [{id: t.id, name: trackLabel(t.name), delegators: on.length, capital: sum(d => BigInt(d.balance)), votes: sum(d => weigh(d.balance, d.conviction)), href: hrefOf(t.id === picked ? '' : t.id), picked: t.id === picked}]
    })
}

export default async function Received({hex, addr, chain, sp, delegations, maxDelegations}: TabCtx & {delegations: AccountSummary['delegationsIn']; maxDelegations: bigint}) {
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
            <Card size="flush" className="mb-3">
                <ReceivedTracksTable rows={perTrack(delegations, tracks, track, t => tabHref(addr, 'received', {dtrack: t}))} chain={chain} />
            </Card>
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
