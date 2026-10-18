import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {fmtInt, fmtPct} from '@/lib/format'
import {votesFor, votesSummary} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'
import {VotesTable} from './VotesTable'

export default async function Votes({hex, addr, chain, sp, firstSeenBlock, locked}: TabCtx & {firstSeenBlock: number; locked: string}) {
    const pg = paging(sp)
    const [{votes, conn}, sum] = await Promise.all([votesFor(hex, pg.size, pg.offset), votesSummary(hex, firstSeenBlock)])
    return (
        <>
            <StatTile
                label="All votes"
                value={fmtInt(sum.all.totalCount)}
                beside={[
                    {label: 'Active', value: fmtInt(sum.active.totalCount)},
                    {label: 'Participation rate', value: sum.open.totalCount > 0 ? fmtPct(sum.all.totalCount, sum.open.totalCount) : '—'},
                    {label: 'Total locked', value: <Approx planck={locked} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                ]}
                pairs
                className="mb-3"
            />
            <Card size="flush">
                <VotesTable rows={votes} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'votes')} />
        </>
    )
}
