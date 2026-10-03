import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {votesFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'
import {VotesTable} from './VotesTable'

export default async function Votes({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {votes, conn} = await votesFor(hex, pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <VotesTable rows={votes} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'votes')} />
        </>
    )
}
