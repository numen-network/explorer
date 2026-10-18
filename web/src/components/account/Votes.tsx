import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {chainDbHead} from '@/lib/chain'
import {fmtInt, fmtPct, sentenceCase} from '@/lib/format'
import {VOTE_LIST_KEYS, votesFor, votesSummary, type VoteList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {inlineRefs, voteEntry} from '@/lib/voteEntry'
import {tabHref, type TabCtx} from './shared'
import VoteRecord from './VoteRecord'
import {VotesTable} from './VotesTable'

const TYPES: VoteList[] = ['aye', 'nay', 'split', 'abstain']

export default async function Votes({hex, addr, chain, sp, firstSeenBlock, locked}: TabCtx & {firstSeenBlock: number; locked: string}) {
    const pg = paging(sp)
    const type = VOTE_LIST_KEYS.find(l => l === sp.type) ?? ''
    const [page, sum, head] = await Promise.all([votesFor(hex, type, pg.size, pg.offset), votesSummary(hex, firstSeenBlock), chainDbHead()])
    const refs = await inlineRefs([...page.delegations.values()])
    const details = new Map(page.votes.filter(v => v.kind === 'Standard').map(v => [v.id, voteEntry(v, {id: hex}, page.delegations.get(v.referendum.index) ?? [], refs, chain.ss58)]))
    return (
        <>
            <StatTile
                label="All votes"
                value={fmtInt(sum.all.totalCount)}
                beside={[
                    {label: 'Active', value: fmtInt(sum.active.totalCount)},
                    {label: 'Participation rate', tip: 'Counts only referenda still open after the account first appeared', value: sum.open.totalCount > 0 ? fmtPct(sum.all.totalCount, sum.open.totalCount) : '—'},
                    {label: 'Total locked', value: <Approx planck={locked} decimals={chain.decimals} symbol={chain.symbol} breakable />},
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
