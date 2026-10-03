import VoteLists, {type VoteGroup, type VoteRows} from '@/components/votes'
import type {ChainProps} from '@/lib/chain'
import {capitalOf, convictionLabel, votesOf, weigh} from '@/lib/conviction'
import {planckToNum} from '@/lib/format'
import {accountRefs, delegationsFor, referendumVotes, VOTE_LISTS, type ReferendumVoteRow, type VoteList} from '@/lib/gql'
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
        rows: rows.map(v => ({id: v.id, addr: ss58Encode(v.voter.id, chain.ss58), acc: v.voter, amounts: lead.map(f => planckToNum(v[f]!, chain.decimals))})),
    }
}

async function standardRows(rows: ReferendumVoteRow[], track: string, chain: ChainProps): Promise<VoteRows> {
    const dels = await delegationsFor(rows.map(v => v.voter.id), track)
    const byTarget = new Map<string, typeof dels.delegations>()
    for (const d of dels.delegations) byTarget.set(d.target.id, [...(byTarget.get(d.target.id) ?? []), d])
    const inline = [...new Set([...byTarget.values()].flatMap(list => list.slice(0, INLINE_DELEGATORS).map(d => d.who.id)))]
    const refs = new Map((await accountRefs(inline)).accounts.map(a => [a.id, a]))
    const num = (planck: string | bigint) => planckToNum(planck, chain.decimals)
    const addr = (id: string) => ss58Encode(id, chain.ss58)
    return {
        kind: 'standard',
        partial: dels.delegations.length < dels.conn.totalCount,
        rows: rows.map(v => {
            const list = byTarget.get(v.voter.id) ?? []
            return {
                id: v.id,
                addr: addr(v.voter.id),
                acc: v.voter,
                conviction: convictionLabel(v.conviction),
                capital: num(capitalOf(v)),
                selfVotes: num(votesOf(v)),
                delegatorCount: list.length,
                delegatedCapital: list.reduce((n, d) => n + num(d.balance), 0),
                delegatedVotes: list.reduce((n, d) => n + num(weigh(d.balance, d.conviction)), 0),
                delegators: list.slice(0, INLINE_DELEGATORS).map(d => ({
                    addr: addr(d.who.id),
                    acc: refs.get(d.who.id),
                    conviction: convictionLabel(d.conviction),
                    capital: num(d.balance),
                    votes: num(weigh(d.balance, d.conviction)),
                })),
            }
        }),
    }
}

interface Props {
    index: number
    track: string
    counts: Record<VoteList, number>
    at: string
    pg: Paging
    chain: ChainProps
}

export async function votesPanel({index, track, counts, at, pg, chain}: Props) {
    // split votes are rare, they only earn a list when the referendum has any
    const lists = LISTS.filter(([l]) => l !== 'split' || counts.split > 0)
    const [list] = lists.find(([l]) => l === at) ?? lists.find(([l]) => counts[l] > 0) ?? lists[0]
    const groups: VoteGroup[] = lists.map(([l, label]) => ({label, total: counts[l], href: `/referendum/${index}?tab=votes&group=${l}`, active: l === list}))
    const rows = await referendumVotes(index, list, {limit: pg.size, offset: pg.offset})
    const shown = list === 'abstain' || list === 'split' ? splitRows(list, rows, chain) : await standardRows(rows, track, chain)
    return <VoteLists groups={groups} list={shown} paging={pg} symbol={chain.symbol} />
}
