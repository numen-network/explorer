import type {ReactNode} from 'react'
import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {delegationsInPage, delegationsOutFor, trackList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationsTable} from './DelegationsTable'
import {tabHref, trackLabel, type TabCtx} from './shared'


export default async function Delegations({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp, 'dpage')
    const track = sp.dtrack ? String(sp.dtrack) : ''
    const [{delegations: out}, {tracks}] = await Promise.all([delegationsOutFor(hex), trackList()])
    const dIn = await delegationsInPage(hex, tracks.map(t => t.id), track, pg.size, pg.offset)

    const href = (extra: Record<string, string | number>) => tabHref(addr, 'delegations', {dtrack: track, ...extra})
    const filter: ReactNode = dIn.all > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted-foreground">Track</span>
            <FilterChip label="All" count={dIn.all} href={tabHref(addr, 'delegations')} active={!track} />
            {tracks
                .filter(t => dIn.perTrack[t.id] > 0)
                .map(t => (
                    <FilterChip key={t.id} label={trackLabel(t.name)} count={dIn.perTrack[t.id]} href={tabHref(addr, 'delegations', {dtrack: t.id})} active={track === t.id} />
                ))}
        </div>
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
                        <DelegationsTable label="Delegated from" rows={dIn.rows} chain={chain} />
                    </Card>
                    <Pager paging={pg} total={dIn.total} href={href({})} pageKey="dpage" />
                </div>
            )}
        </div>
    )
}
