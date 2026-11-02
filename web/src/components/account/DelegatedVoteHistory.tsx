import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {delegatedVoteHistoryFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegatedVoteHistoryTable} from './DelegatedVoteHistoryTable'
import {tabHref, type TabCtx} from './shared'

export default async function DelegatedVoteHistory({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {actions, conn} = await delegatedVoteHistoryFor(hex, pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <DelegatedVoteHistoryTable rows={actions} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'delegated-vote-history')} />
        </>
    )
}
