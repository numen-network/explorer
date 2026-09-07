import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {transfersPage} from '@/lib/gql'
import {TransfersTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Transfers'}


export default async function TransfersPage(props: PageProps<'/transfers'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    const [chain, {transfers, conn}] = await Promise.all([chainProps(), transfersPage(pg.size, pg.offset)])

    return (
        <div>
            <Refresh />
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Transfers</h1>
                <span className="text-xs text-muted-foreground">{fmtInt(conn.totalCount)} total</span>
            </div>
            <Card size="flush" className="mt-3">
                <TransfersTable rows={transfers} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href="/transfers" />
        </div>
    )
}
