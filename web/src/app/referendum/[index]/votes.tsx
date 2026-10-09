import VoteLists, {type VoteGroup, type VoteRows} from '@/components/votes'
import type {ChainProps} from '@/lib/chain'
import {capitalOf, convictionLabel, votesOf, weigh} from '@/lib/conviction'
import {accountRefs, countedDelegations, referendumVotes, VOTE_LISTS, type ReferendumVoteRow, type VoteList} from '@/lib/gql'
import type {Paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'

// the panel answers who is behind the vote, the full roster lives on the
// delegate account page
const INLINE_DELEGATORS = 10

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
    const inline = [...new Set([...byVoter.values()].flatMap(list => list.slice(0, INLINE_DELEGATORS).map(d => d.delegator.id)))]
    const refs = new Map((await accountRefs(inline)).accounts.map(a => [a.id, a]))
    const addr = (id: string) => ss58Encode(id, chain.ss58)
    return {
        kind: 'standard',
        rows: rows.map(v => {
            const list = byVoter.get(v.voter.id) ?? []
            return {
                id: v.id,
                addr: addr(v.voter.id),
                acc: v.voter,
                conviction: convictionLabel(v.conviction),
                capital: String(capitalOf(v)),
                selfVotes: String(votesOf(v)),
                delegatorCount: list.length,
                delegatedCapital: String(list.reduce((n, d) => n + BigInt(d.balance), 0n)),
                delegatedVotes: String(list.reduce((n, d) => n + weigh(d.balance, d.conviction), 0n)),
                delegators: list.slice(0, INLINE_DELEGATORS).map(d => ({
                    addr: addr(d.delegator.id),
                    acc: refs.get(d.delegator.id),
                    conviction: convictionLabel(d.conviction),
                    capital: d.balance,
                    votes: String(weigh(d.balance, d.conviction)),
                })),
            }
        }),
    }
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
