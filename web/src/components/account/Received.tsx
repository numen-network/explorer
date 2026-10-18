import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {trackLabel} from '@/lib/format'
import {delegationsInPage, trackList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {tabHref, type TabCtx} from './shared'

export default async function Received({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {tracks} = await trackList()
    const trackIds = tracks.map(t => t.id)
    const track = trackIds.includes(String(sp.dtrack)) ? String(sp.dtrack) : ''
    const dIn = await delegationsInPage(hex, trackIds, track, pg.size, pg.offset)

    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)

    return (
        <>
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
