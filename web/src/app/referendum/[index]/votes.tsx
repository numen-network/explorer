import VoteLists, {type VoteGroup, type VoteRows} from '@/components/votes'
import type {ChainProps} from '@/lib/chain'
import {countedDelegations, referendumVotes, VOTE_LISTS, type ReferendumVoteRow, type VoteList} from '@/lib/gql'
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

async function standardRows(rows: ReferendumVoteRow[], index: number, chain: ChainProps): Promise<VoteRows> {
    const dels = await countedDelegations(index, rows.map(v => v.voter.id))
    const byVoter = new Map<string, typeof dels>()
    for (const d of dels) byVoter.set(d.voter.id, [...(byVoter.get(d.voter.id) ?? []), d])
    const refs = await inlineRefs([...byVoter.values()])
    return {kind: 'standard', rows: rows.map(v => voteEntry(v, {id: v.voter.id, acc: v.voter}, byVoter.get(v.voter.id) ?? [], refs, chain.ss58))}
}

interface Props {
    index: number
    counts: Record<VoteList, number>
    at: string
    pg: Paging
    chain: ChainProps
}

export async function votesPanel({index, counts, at, pg, chain}: Props) {
    // split votes are rare, they only earn a list when the referendum has any
    const lists = LISTS.filter(([l]) => l !== 'split' || counts.split > 0)
    const [list] = lists.find(([l]) => l === at) ?? lists.find(([l]) => counts[l] > 0) ?? lists[0]
    const groups: VoteGroup[] = lists.map(([l, label]) => ({label, total: counts[l], href: `/referendum/${index}?tab=votes&group=${l}`, active: l === list}))
    const rows = await referendumVotes(index, list, {limit: pg.size, offset: pg.offset})
    const shown = list === 'abstain' || list === 'split' ? splitRows(list, rows, chain) : await standardRows(rows, index, chain)
    return <VoteLists groups={groups} list={shown} paging={pg} decimals={chain.decimals} symbol={chain.symbol} />
}
