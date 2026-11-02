import Pager from '@/components/Pager'
import SearchBox from '@/components/SearchBox'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {trackLabel} from '@/lib/format'
import {DELEGATION_SORTS, loadDelegationSort, loadSearch} from '@/lib/actionFilters'
import {accountSearch, delegationsInPage, trackList, type Delegate} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegateTile} from './DelegateTile'
import {DelegationsTable} from './DelegationsTable'
import {tabHref, type TabCtx} from './shared'

export default async function Delegators({hex, addr, chain, sp, delegate}: TabCtx & {delegate: Delegate}) {
    const {tracks} = await trackList()
    const pg = paging(sp)
    const trackIds = tracks.map(t => t.id)
    const track = trackIds.includes(String(sp.dtrack)) ? String(sp.dtrack) : ''
    const q = loadSearch(sp).q.trim()
    const {sort: by, order: dir} = loadDelegationSort(sp)
    const dIn = await delegationsInPage(hex, trackIds, track, accountSearch(q, chain.ss58), {by, dir}, pg.size, pg.offset)
    // the default order stays out of the url, and a new order starts over at the first page
    const sorted = (s: typeof by, o: typeof dir): Record<string, string> => (s === 'capital' && o === 'desc' ? {sort: '', order: ''} : {sort: s, order: o})
    const href = (dtrack: string) => tabHref(addr, 'delegators', {dtrack, q, ...sorted(by, dir)})
    const hrefs = Object.fromEntries(
        DELEGATION_SORTS.map(s => [s, tabHref(addr, 'delegators', {dtrack: track, q, ...sorted(s, s === by && dir === 'desc' ? 'asc' : 'desc')})])
    ) as Record<typeof by, string>
    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)
    return (
        <>
            <DelegateTile delegate={delegate} chain={chain} />
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <FilterSelect label="Track" values={trackIds} labelOf={trackName} counts={dIn.perTrack} allCount={dIn.all} value={track} href={href} />
                <SearchBox className="w-full sm:w-90" />
            </div>
            <Card size="flush">
                <DelegationsTable rows={dIn.rows} chain={chain} filtered={track !== '' || q !== ''} sort={{by, dir, hrefs}} />
            </Card>
            <Pager paging={pg} total={dIn.total} href={href(track)} />
        </>
    )
}
