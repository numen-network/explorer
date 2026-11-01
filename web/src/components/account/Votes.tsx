import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {chainDbHead} from '@/lib/chain'
import {fmtInt, sentenceCase} from '@/lib/format'
import {VOTE_LIST_KEYS, votesFor, votesSummary, type VoteList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {inlineRefs, voteEntry} from '@/lib/voteEntry'
import {participationFrom, participationStat, tabHref, type TabCtx} from './shared'
import VoteRecord from './VoteRecord'
import {VotesTable} from './VotesTable'

const TYPES: VoteList[] = ['aye', 'nay', 'split', 'abstain']

export default async function Votes({hex, addr, chain, sp, firstSeenBlock, ownVotes, receivedVotes}: TabCtx & {firstSeenBlock: number; ownVotes: string; receivedVotes: string}) {
    const pg = paging(sp)
    const type = VOTE_LIST_KEYS.find(l => l === sp.type) ?? ''
    const head = await chainDbHead()
    const [page, sum] = await Promise.all([votesFor(hex, type, pg.size, pg.offset), votesSummary(hex, participationFrom(firstSeenBlock, head.height, chain.blockTime))])
    const found = new Set<string>()
    const refs = await inlineRefs([...page.delegations.values()], found)
    const details = new Map(page.votes.filter(v => v.kind === 'Standard').map(v => [v.id, voteEntry(v, {id: hex}, page.delegations.get(v.referendum.index) ?? [], found, refs, chain.ss58)]))
    return (
        <>
            <StatTile
                label="All votes"
                value={fmtInt(sum.all.totalCount)}
                beside={[
                    participationStat(sum),
                    {label: 'Total votes', value: <Approx planck={BigInt(ownVotes) + BigInt(receivedVotes)} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                    {label: 'Own votes', value: <Approx planck={ownVotes} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                    {label: 'Received votes', value: <Approx planck={receivedVotes} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                ]}
                pairs
                className="mb-3"
            />
            <VoteRecord hex={hex} />
            <FilterRow
                label="Type"
                className="mb-3"
                values={TYPES}
                labelOf={sentenceCase}
                value={type}
                counts={page.counts}
                allCount={page.all}
                href={t => tabHref(addr, 'votes', {type: t})}
            />
            <Card size="flush">
                <VotesTable rows={page.votes} details={details} moreHref={tabHref(addr, 'received', {rtab: 'delegators'})} head={head.height} chain={chain} />
            </Card>
            <Pager paging={pg} total={page.total} href={tabHref(addr, 'votes', {type})} />
        </>
    )
}
