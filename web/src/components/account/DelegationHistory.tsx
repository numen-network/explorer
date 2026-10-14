import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {delegationHistoryFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationHistoryTable} from './DelegationHistoryTable'
import {DirectionFilter, directionOf, tabHref, type TabCtx} from './shared'

export default async function DelegationHistory({hex, addr, chain, sp}: TabCtx) {
    const dir = directionOf(sp)
    const pg = paging(sp)
    const {actions, conn} = await delegationHistoryFor(hex, dir, pg.size, pg.offset)

    return (
        <>
            <DirectionFilter addr={addr} tab="delegation-history" value={dir} />
            <Card size="flush">
                <DelegationHistoryTable rows={actions} hex={hex} chain={chain} filtered={!!dir} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'delegation-history', {dir})} />
        </>
    )
}
