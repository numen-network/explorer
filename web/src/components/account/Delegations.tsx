import type {ReactNode} from 'react'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {delegationsInPage, delegationsOutFor, trackList} from '@/lib/gql'
import {trackLabel} from '@/lib/format'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {tabHref, type TabCtx} from './shared'


export default async function Delegations({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const [{delegations: out}, {tracks}] = await Promise.all([delegationsOutFor(hex), trackList()])
    const trackIds = tracks.map(t => t.id)
    const track = trackIds.includes(String(sp.dtrack)) ? String(sp.dtrack) : ''
    const dIn = await delegationsInPage(hex, trackIds, track, pg.size, pg.offset)

    const href = (extra: Record<string, string | number>) => tabHref(addr, 'delegations', {dtrack: track, ...extra})
    const trackName = (id: string) => trackLabel(tracks.find(t => t.id === id)!.name)
    const filter: ReactNode = dIn.all > 0 && (
        <FilterRow label="Track" className="mb-3" values={trackIds} labelOf={trackName} counts={dIn.perTrack} allCount={dIn.all} value={track} href={t => tabHref(addr, 'delegations', {dtrack: t})} />
    )

    return (
        <div className="space-y-3">
            {out.length > 0 && (
                <Card size="flush">
                    <DelegationsTable label="Delegating to" rows={out} chain={chain} />
                </Card>
            )}
            {(dIn.rows.length > 0 || filter) && (
                <div>
                    {filter}
                    <Card size="flush">
                        <DelegationsTable label="Delegated from" rows={dIn.rows} chain={chain} filtered={!!track} />
                    </Card>
                    <Pager paging={pg} total={dIn.total} href={href({})} />
                </div>
            )}
        </div>
    )
}
