import ActionList, {type ActionImpact, type ActionRow} from '@/components/actions'
import {actionFiltersUrl, loadActionFilters} from '@/lib/actionFilters'
import type {ChainProps} from '@/lib/chain'
import {decisionOf, votesOf} from '@/lib/conviction'
import {accountSearch, referendumActions, type VotingActionRow} from '@/lib/gql'
import type {Paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'

function rowOf(a: VotingActionRow, ss58: number): ActionRow {
    const own = votesOf(a)
    const impact: ActionImpact | undefined =
        a.approvalPart == null ? undefined : {approval: [BigInt(a.approvalPart), BigInt(a.approvalWhole!)], support: [BigInt(a.supportPart!), BigInt(a.supportWhole!)]}
    const row = {
        id: a.id,
        block: a.block,
        iso: a.timestamp,
        actor: {addr: ss58Encode(a.voter.id, ss58), acc: a.voter},
        own: String(own),
        delegated: a.delegatedVotes,
        impact,
    }
    return a.delegator == null
        ? {...row, kind: a.method === 'Voted' ? 'vote' : 'remove', decision: decisionOf(a)}
        : {...row, kind: a.method === 'Delegated' ? 'delegate' : 'undelegate', by: {addr: ss58Encode(a.delegator.id, ss58), acc: a.delegator}}
}

interface Props {
    index: number
    sp: Record<string, string | string[] | undefined>
    pg: Paging
    chain: ChainProps
}

export async function actionsPanel({index, sp, pg, chain}: Props) {
    const filters = loadActionFilters(sp)
    const q = filters.q.trim()
    const kind = filters.action ?? undefined
    const move = filters.impact ?? undefined
    const {actions, conn} = await referendumActions(index, {kind, move, ...accountSearch(q, chain.ss58)}, {limit: pg.size, offset: pg.offset})
    return (
        <ActionList
            rows={actions.map(a => rowOf(a, chain.ss58))}
            total={conn.totalCount}
            filtered={q !== '' || kind != null || move != null}
            paging={pg}
            href={actionFiltersUrl(`/referendum/${index}?tab=curves`, filters)}
            decimals={chain.decimals}
            symbol={chain.symbol}
        />
    )
}
