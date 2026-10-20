import HoldingsTable from '@/components/HoldingsTable'
import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {tokenHoldingsFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'

export default async function Holdings({addr, evm, sp}: TabCtx & {evm: string}) {
    const pg = paging(sp)
    const {holdings, conn} = await tokenHoldingsFor(evm, pg.size, pg.offset)

    return (
        <>
            <Card size="flush">
                <HoldingsTable rows={holdings} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'holdings')} />
        </>
    )
}
