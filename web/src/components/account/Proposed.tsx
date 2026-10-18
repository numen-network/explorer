import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {proposedFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ProposedTable} from './ProposedTable'
import {tabHref, type TabCtx} from './shared'

export default async function Proposed({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {rows, total} = await proposedFor(hex, pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <ProposedTable rows={rows} chain={chain} />
            </Card>
            <Pager paging={pg} total={total} href={tabHref(addr, 'proposed')} />
        </>
    )
}
