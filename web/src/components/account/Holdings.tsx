import HoldingsList from '@/components/HoldingsList'
import Pager from '@/components/Pager'
import {tokenHoldingsFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'

export default async function Holdings({addr, evm, sp}: TabCtx & {evm: string}) {
    const pg = paging(sp)
    const {holdings, conn} = await tokenHoldingsFor(evm, pg.size, pg.offset)

    return (
        <>
            <HoldingsList rows={holdings} />
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'holdings')} />
        </>
    )
}
