import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {chainDbHead} from '@/lib/chain'
import {sentenceCase} from '@/lib/format'
import {VOTE_LIST_KEYS, votesFor, type VoteList} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {inlineRefs, voteEntry} from '@/lib/voteEntry'
import {tabHref, type TabCtx} from './shared'
import {VotesTable} from './VotesTable'
import VotingHead from './VotingHead'
import type {Voting} from './VotingTile'

const TYPES: VoteList[] = ['aye', 'nay', 'split', 'abstain']

export default async function Votes({hex, addr, chain, sp, voting}: TabCtx & {voting: Voting}) {
    const pg = paging(sp)
    const type = VOTE_LIST_KEYS.find(l => l === sp.type) ?? ''
    const [head, page] = await Promise.all([chainDbHead(), votesFor(hex, type, pg.size, pg.offset)])
    const found = new Set<string>()
    const refs = await inlineRefs([...page.delegations.values()], found)
    const details = new Map(page.votes.filter(v => v.kind === 'Standard').map(v => [v.id, voteEntry(v, {id: hex}, page.delegations.get(v.referendum.index) ?? [], found, refs, chain.ss58)]))
    return (
        <>
            <VotingHead hex={hex} chain={chain} voting={voting} />
            <FilterRow
                label="Type"
                className="mb-3"
                values={TYPES}
                labelOf={sentenceCase}
                value={type}
                counts={page.counts}
                allCount={page.all}
                href={t => tabHref(addr, 'direct-votes', {type: t})}
            />
            <Card size="flush">
                <VotesTable rows={page.votes} details={details} moreHref={tabHref(addr, 'delegators')} head={head.height} chain={chain} />
            </Card>
            <Pager paging={pg} total={page.total} href={tabHref(addr, 'direct-votes', {type})} />
        </>
    )
}
