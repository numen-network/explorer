import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import SearchBox from '@/components/SearchBox'
import StatTile from '@/components/StatTile'
import {TabNav} from '@/components/Tabs'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {fmtInt, trackLabel} from '@/lib/format'
import {DELEGATION_SORTS, loadDelegationSort, loadSearch} from '@/lib/actionFilters'
import {accountSearch, delegationsInPage, trackList, type Delegate} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {ReceivedTracksTable, type ReceivedTrackRow} from './ReceivedTracksTable'
import {tabHref, type TabCtx} from './shared'

type Tracks = {id: string; name: string}[]

const perTrack = (delegate: Delegate | null, hrefOf: (track: string) => string): ReceivedTrackRow[] =>
    (delegate?.trackTotals ?? []).map(t => ({id: t.track.id, name: trackLabel(t.track.name), delegators: t.delegators, capital: t.capital, votes: t.votes, href: hrefOf(t.track.id)}))

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

export default async function Received(props: TabCtx & {delegate: Delegate | null; total: number}) {
    const {addr, chain, sp, delegate, total} = props
    const {tracks} = await trackList()
    // a Track filter belongs to the delegator list, so a link carrying one opens it
    const view = sp.rtab === 'delegators' || (sp.rtab == null && sp.dtrack != null) ? 'delegators' : 'tracks'
    const rows = perTrack(delegate, t => tabHref(addr, 'received', {rtab: 'delegators', dtrack: t}))
    const amount = (planck: string | bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />

    return (
        <>
            <TabNav
                aria-label="Received"
                items={[
                    {label: 'Tracks', count: rows.length, href: tabHref(addr, 'received', {rtab: 'tracks'}), active: view === 'tracks'},
                    {label: 'Delegators', count: total, href: tabHref(addr, 'received', {rtab: 'delegators'}), active: view === 'delegators'},
                ]}
            />
            <div className="mt-4">
                {delegate && (
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
