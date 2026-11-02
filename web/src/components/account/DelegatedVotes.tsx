import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {sentenceCase} from '@/lib/format'
import {DELEGATED_VOTE_LISTS, delegatedVotesFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegatedVotesTable} from './DelegatedVotesTable'
import {tabHref, type TabCtx} from './shared'
import VotingHead from './VotingHead'
import type {Voting} from './VotingTile'

export default async function DelegatedVotes({hex, addr, chain, sp, voting}: TabCtx & {voting: Voting}) {
    const pg = paging(sp)
    const type = DELEGATED_VOTE_LISTS.find(l => l === sp.type) ?? ''
    const page = await delegatedVotesFor(hex, type, pg.size, pg.offset)
    return (
        <>
            <VotingHead hex={hex} chain={chain} voting={voting} />
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
