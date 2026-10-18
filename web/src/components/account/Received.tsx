import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import SearchBox from '@/components/SearchBox'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtInt, trackLabel} from '@/lib/format'
import {weigh} from '@/lib/conviction'
import {DELEGATION_SORTS, loadDelegationSort, loadSearch} from '@/lib/actionFilters'
import {accountSearch, delegateTally, delegationsInPage, trackList, type AccountSummary} from '@/lib/gql'
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
    const q = loadSearch(sp).q.trim()
    const {sort: by, order: dir} = loadDelegationSort(sp)
    const dIn = await delegationsInPage(hex, trackIds, track, accountSearch(q, chain.ss58), {by, dir}, pg.size, pg.offset)
    // the default order stays out of the url, and a new order starts over at the first page
    const sorted = (s: typeof by, o: typeof dir): Record<string, string> => (s === 'capital' && o === 'desc' ? {sort: '', order: ''} : {sort: s, order: o})
    const href = (dtrack: string) => tabHref(addr, 'received', {rtab: 'delegators', dtrack, q, ...sorted(by, dir)})
    const hrefs = Object.fromEntries(
        DELEGATION_SORTS.map(s => [s, tabHref(addr, 'received', {rtab: 'delegators', dtrack: track, q, ...sorted(s, s === by && dir === 'desc' ? 'asc' : 'desc')})])
    ) as Record<typeof by, string>
    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)
    return (
        <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <FilterSelect label="Track" values={trackIds} labelOf={trackName} counts={dIn.perTrack} allCount={dIn.all} value={track} href={href} />
                <SearchBox className="w-full sm:w-90" />
            </div>
            <Card size="flush">
                <DelegationsTable label="Delegated from" rows={dIn.rows} chain={chain} filtered={track !== '' || q !== ''} sort={{by, dir, hrefs}} />
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
