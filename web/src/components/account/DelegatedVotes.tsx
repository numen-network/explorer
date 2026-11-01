import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {chainDbHead} from '@/lib/chain'
import {fmtInt, sentenceCase} from '@/lib/format'
import {DELEGATED_VOTE_LISTS, delegatedVotesFor, delegatedVotesSummary} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegatedVotesTable} from './DelegatedVotesTable'
import {participationFrom, participationStat, tabHref, type TabCtx} from './shared'

export default async function DelegatedVotes({hex, addr, chain, sp, firstSeenBlock, delegatedVotes}: TabCtx & {firstSeenBlock: number; delegatedVotes: string}) {
    const pg = paging(sp)
    const type = DELEGATED_VOTE_LISTS.find(l => l === sp.type) ?? ''
    const head = await chainDbHead()
    const [page, sum] = await Promise.all([delegatedVotesFor(hex, type, pg.size, pg.offset), delegatedVotesSummary(hex, participationFrom(firstSeenBlock, head.height, chain.blockTime))])
    return (
        <>
            <StatTile
                label="All votes"
                value={fmtInt(page.standing)}
                beside={[
                    participationStat(sum),
                    {label: 'Delegated votes', value: <Approx planck={delegatedVotes} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                ]}
                pairs
                className="mb-3"
            />
            <FilterRow
                label="Type"
                className="mb-3"
                values={DELEGATED_VOTE_LISTS}
                labelOf={sentenceCase}
                value={type}
                counts={page.counts}
                allCount={page.all}
                href={t => tabHref(addr, 'delegated-votes', {type: t})}
            />
            <Card size="flush">
                <DelegatedVotesTable rows={page.rows} chain={chain} />
            </Card>
            <Pager paging={pg} total={page.total} href={tabHref(addr, 'delegated-votes', {type})} />
        </>
    )
}
