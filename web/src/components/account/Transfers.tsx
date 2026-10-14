import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {transfersFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {TransfersTable} from './TransfersTable'
import {DirectionFilter, directionOf, tabHref, type TabCtx} from './shared'

export default async function Transfers({hex, addr, chain, sp}: TabCtx) {
    const dir = directionOf(sp)
    const pg = paging(sp)
    const {transfers, conn} = await transfersFor(hex, dir, pg.size, pg.offset)

    return (
        <>
            <DirectionFilter addr={addr} tab="transfers" value={dir} />
            <Card size="flush">
                <TransfersTable rows={transfers} hex={hex} chain={chain} filtered={!!dir} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'transfers', {dir})} />
        </>
    )
}
