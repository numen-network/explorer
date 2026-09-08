import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {subIdentitiesPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {SubsTable} from './SubsTable'
import {tabHref, type TabCtx} from './shared'


export default async function Subs({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {accounts, conn} = await subIdentitiesPage(hex, pg.size, pg.offset)

    return (
        <>
            <Card size="flush">
                <SubsTable rows={accounts} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'subs')} />
        </>
    )
}
