import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {voteChanges} from '@/lib/conviction'
import {ownVoteHistory, voteHistoryFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'
import {VoteHistoryTable} from './VoteHistoryTable'

export default async function VoteHistory({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {actions, conn} = await voteHistoryFor(hex, pg.size, pg.offset)
    const changes = voteChanges(await ownVoteHistory(actions.map(a => a.referendum.index), [hex]))
    return (
        <>
            <Card size="flush">
                <VoteHistoryTable rows={actions.map(a => ({...a, change: changes.get(a.id)}))} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'direct-vote-history')} />
        </>
    )
}
