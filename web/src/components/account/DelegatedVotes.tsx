import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {loadDelegateFilter} from '@/lib/actionFilters'
import {sentenceCase} from '@/lib/format'
import {DELEGATED_VOTE_LISTS, delegatedVotesFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'
import {DelegatedVotesTable} from './DelegatedVotesTable'
import {refName, tabHref, type TabCtx} from './shared'
import VotingHead from './VotingHead'
import type {Voting} from './VotingTile'

export default async function DelegatedVotes({hex, addr, chain, sp, voting}: TabCtx & {voting: Voting}) {
    const pg = paging(sp)
    const type = DELEGATED_VOTE_LISTS.find(l => l === sp.type) ?? ''
    const {delegate} = loadDelegateFilter(sp)
    const page = await delegatedVotesFor(hex, type, ss58TryDecode(delegate, chain.ss58), pg.size, pg.offset)
    const delegates = new Map(page.delegates.map(d => [ss58Encode(d.voter.id, chain.ss58), d]))
    const href = (f: {type?: string; delegate?: string}) => tabHref(addr, 'delegated-votes', {type, delegate, ...f})
    return (
        <>
            <VotingHead hex={hex} chain={chain} voting={voting} />
            <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-3">
                <FilterSelect label="Type" values={DELEGATED_VOTE_LISTS} labelOf={sentenceCase} value={type} counts={page.counts} allCount={page.all} href={t => href({type: t})} />
                <FilterSelect
                    label="Delegate"
                    values={[...delegates.keys()]}
                    labelOf={a => refName(delegates.get(a)!.voter.id, delegates.get(a)!.voter, chain)}
                    value={delegate}
                    counts={Object.fromEntries([...delegates].map(([a, d]) => [a, d.count]))}
                    allCount={page.delegates.reduce((n, d) => n + d.count, 0)}
                    href={d => href({delegate: d})}
                />
            </div>
            <Card size="flush">
                <DelegatedVotesTable rows={page.rows} chain={chain} />
            </Card>
            <Pager paging={pg} total={page.total} href={href({})} />
        </>
    )
}
