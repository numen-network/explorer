import VoteLists, {type VoteGroup, type VoteRows} from '@/components/votes'
import {loadSearch} from '@/lib/actionFilters'
import type {ChainProps} from '@/lib/chain'
import {accountSearch, countedDelegations, referendumVoteCounts, referendumVotes, voteSearch, VOTE_LISTS, type ReferendumVoteRow, type VoteList} from '@/lib/gql'
import type {Paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {inlineRefs, voteEntry} from '@/lib/voteEntry'

const LISTS: [VoteList, string][] = [
    ['aye', 'Aye'],
    ['nay', 'Nay'],
    ['abstain', 'Abstain'],
    ['split', 'Split'],
]

const PART = {abstainAmount: 'Abstain', ayeAmount: 'Aye', nayAmount: 'Nay'}

function splitRows(list: 'abstain' | 'split', rows: ReferendumVoteRow[], chain: ChainProps): VoteRows {
    const {lead} = VOTE_LISTS[list]
    return {
        kind: 'split',
        labels: lead.map(f => PART[f]),
        rows: rows.map(v => ({id: v.id, addr: ss58Encode(v.voter.id, chain.ss58), acc: v.voter, amounts: lead.map(f => v[f]!)})),
    }
}

async function standardRows(rows: ReferendumVoteRow[], index: number, whole: string, chain: ChainProps): Promise<VoteRows> {
    const dels = await countedDelegations(index, rows.map(v => v.voter.id))
    const byVoter = new Map<string, typeof dels>()
    for (const d of dels) byVoter.set(d.voter.id, [...(byVoter.get(d.voter.id) ?? []), d])
    const refs = await inlineRefs([...byVoter.values()])
    return {kind: 'standard', whole, rows: rows.map(v => voteEntry(v, {id: v.voter.id, acc: v.voter}, byVoter.get(v.voter.id) ?? [], refs, chain.ss58))}
}

interface Props {
    index: number
    counts: Record<VoteList, number>
    tally: {ayes: string; nays: string}
    sp: Record<string, string | string[] | undefined>
    pg: Paging
    chain: ChainProps
}

export async function votesPanel({index, counts, tally, sp, pg, chain}: Props) {
    const at = String(sp.group ?? '')
    const q = loadSearch(sp).q.trim()
    const search = await voteSearch(index, accountSearch(q, chain.ss58))
    // split votes are rare, they only earn a list when the referendum has any
    const lists = LISTS.filter(([l]) => l !== 'split' || counts.split > 0)
    // with no list asked for, the first list holding a hit opens
    const found = await referendumVoteCounts(search)
    const [list] = lists.find(([l]) => l === at) ?? lists.find(([l]) => found[l] > 0) ?? lists[0]
    const href = (l: VoteList) => `/referendum/${index}?${new URLSearchParams({tab: 'votes', group: l, ...(q && {q})})}`
    const groups: VoteGroup[] = lists.map(([l, label]) => ({label, total: found[l], href: href(l), active: l === list}))
    const votes = await referendumVotes(list, search, {limit: pg.size, offset: pg.offset})
    const shown = list === 'abstain' || list === 'split' ? splitRows(list, votes, chain) : await standardRows(votes, index, list === 'aye' ? tally.ayes : tally.nays, chain)
    return <VoteLists groups={groups} list={shown} searched={q !== ''} paging={pg} decimals={chain.decimals} symbol={chain.symbol} />
}
