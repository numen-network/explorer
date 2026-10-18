import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {delegationHistoryFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegationHistoryTable} from './DelegationHistoryTable'
import {tabHref, type TabCtx} from './shared'

export default async function DelegationHistory({hex, addr, chain, sp, dir, slug}: TabCtx & {dir: 'in' | 'out'; slug: string}) {
    const pg = paging(sp)
    const {actions, conn} = await delegationHistoryFor(hex, dir, pg.size, pg.offset)

    return (
        <>
            <Card size="flush">
                <DelegationHistoryTable rows={actions} hex={hex} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, slug)} />
        </>
    )
}
