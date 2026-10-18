import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtInt, trackLabel} from '@/lib/format'
import {weigh} from '@/lib/conviction'
import {delegateTally, delegationsInPage, trackList, type AccountSummary} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {ReceivedTracksTable, type ReceivedTrackRow} from './ReceivedTracksTable'
import {tabHref, type TabCtx} from './shared'

type Delegations = AccountSummary['delegationsIn']
type Tracks = {id: string; name: string}[]

// a delegator holds one delegation per track, so the rows on a track count its delegators
function perTrack(delegations: Delegations, tracks: Tracks, hrefOf: (track: string) => string): ReceivedTrackRow[] {
    return tracks.flatMap(t => {
        const on = delegations.filter(d => d.track.id === t.id)
        if (on.length === 0) return []
        const sum = (f: (d: (typeof on)[number]) => bigint) => on.reduce((n, d) => n + f(d), 0n).toString()
        return [{id: t.id, name: trackLabel(t.name), delegators: on.length, capital: sum(d => BigInt(d.balance)), votes: sum(d => weigh(d.balance, d.conviction)), href: hrefOf(t.id)}]
    })
}

async function Delegators({hex, addr, chain, sp, tracks}: TabCtx & {tracks: Tracks}) {
    const pg = paging(sp)
    const trackIds = tracks.map(t => t.id)
    const track = trackIds.includes(String(sp.dtrack)) ? String(sp.dtrack) : ''
    const dIn = await delegationsInPage(hex, trackIds, track, pg.size, pg.offset)
    const href = (dtrack: string) => tabHref(addr, 'received', {rtab: 'delegators', dtrack})
    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)
    return (
        <>
            <FilterSelect label="Track" className="mb-3" values={trackIds} labelOf={trackName} counts={dIn.perTrack} allCount={dIn.all} value={track} href={href} />
            <Card size="flush">
                <DelegationsTable label="Delegated from" rows={dIn.rows} chain={chain} filtered={!!track} />
            </Card>
            <Pager paging={pg} total={dIn.total} href={href(track)} />
        </>
    )
}

export default async function Received(props: TabCtx & {delegations: Delegations; total: number; maxDelegations: bigint}) {
    const {hex, addr, chain, sp, delegations, total, maxDelegations} = props
    const [{tracks}, {delegateById: tally}] = await Promise.all([trackList(), delegateTally(hex)])
    // a Track filter belongs to the delegator list, so a link carrying one opens it
    const view = sp.rtab === 'delegators' || (sp.rtab == null && sp.dtrack != null) ? 'delegators' : 'tracks'
    const rows = perTrack(delegations, tracks, t => tabHref(addr, 'received', {rtab: 'delegators', dtrack: t}))
    const amount = (planck: string | bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />

    return (
        <>
            <TabBar
                aria-label="Received"
                items={[
                    {label: 'Tracks', count: rows.length, href: tabHref(addr, 'received', {rtab: 'tracks'}), active: view === 'tracks'},
                    {label: 'Delegators', count: total, href: tabHref(addr, 'received', {rtab: 'delegators'}), active: view === 'delegators'},
                ]}
            />
            <div className="mt-4">
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
                {view === 'tracks' ? (
                    <Card size="flush">
                        <ReceivedTracksTable rows={rows} chain={chain} />
                    </Card>
                ) : (
                    <Delegators {...props} tracks={tracks} />
                )}
            </div>
        </>
    )
}
