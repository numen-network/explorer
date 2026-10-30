import VoteLists, {type VoteGroup, type VoteRows} from '@/components/votes'
import {loadSearch} from '@/lib/actionFilters'
import type {ChainProps} from '@/lib/chain'
import {accountSearch, countedDelegations, referendumBallots, referendumVoteCounts, referendumVotes, voteSearch, VOTE_LISTS, type ReferendumRow, type ReferendumVoteRow, type TallySnapshotRow, type VoteList} from '@/lib/gql'
import type {Paging} from '@/lib/paging'
import {pivotalAccounts, type Pivotal} from '@/lib/pivotal'
import {isLive} from '@/lib/referendum'
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
        rows: rows.map(v => ({id: v.id, addr: ss58Encode(v.voter.id, chain.ss58), acc: v.voter, amounts: lead.map(f => v[f]!), block: v.block})),
    }
}

async function standardRows(rows: ReferendumVoteRow[], index: number, whole: string, chain: ChainProps): Promise<VoteRows> {
    const dels = await countedDelegations(index, rows.map(v => v.voter.id))
    const byVoter = new Map<string, typeof dels>()
    for (const d of dels) byVoter.set(d.voter.id, [...(byVoter.get(d.voter.id) ?? []), d])
    const refs = await inlineRefs([...byVoter.values()])
    return {kind: 'standard', whole, rows: rows.map(v => voteEntry(v, {id: v.voter.id, acc: v.voter}, byVoter.get(v.voter.id) ?? [], refs, chain.ss58))}
}

// a live tally is weighed against today's active issuance, an ended one
// against the issuance at its last change
async function pivotalOf(r: ReferendumRow, snapshots: TallySnapshotRow[], live: bigint, ss58: number): Promise<Pivotal | null> {
    const last = snapshots.at(-1)
    if (last == null || !(isLive(r) || r.status === 'Approved' || r.status === 'Rejected')) return null
    const active = isLive(r) ? live : BigInt(last.totalIssuance) - BigInt(last.inactiveIssuance)
    const {votes, delegations} = await referendumBallots(r.index)
    const tally = {ayes: BigInt(r.ayes), nays: BigInt(r.nays), support: BigInt(r.support)}
    const {passing, ids} = pivotalAccounts(tally, votes, delegations, r.track, active)
    return {addrs: ids.map(id => ss58Encode(id, ss58)), ended: !isLive(r), passing}
}

interface Props {
    r: ReferendumRow
    counts: Record<VoteList, number>
    snapshots: TallySnapshotRow[]
    live: bigint
    sp: Record<string, string | string[] | undefined>
    pg: Paging
    chain: ChainProps
}

export async function votesPanel({r, counts, snapshots, live, sp, pg, chain}: Props) {
    const index = r.index
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
    const [votes, pivotal] = await Promise.all([referendumVotes(list, search, {limit: pg.size, offset: pg.offset}), pivotalOf(r, snapshots, live, chain.ss58)])
    const shown = list === 'abstain' || list === 'split' ? splitRows(list, votes, chain) : await standardRows(votes, index, list === 'aye' ? r.ayes : r.nays, chain)
    return <VoteLists groups={groups} list={shown} pivotal={pivotal} searched={q !== ''} paging={pg} decimals={chain.decimals} symbol={chain.symbol} />
}
