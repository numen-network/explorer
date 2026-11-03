import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {transfersPage} from '@/lib/gql'
import {TransfersTable} from './table'
import {withHeads} from '@/components/withHeads'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Transfers'}


async function TransfersPage(props: PageProps<'/transfers'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const {transfers, conn} = await transfersPage(pg.size, pg.offset, head.height)

    return (
        <div>
            <Refresh ms={chain.blockTime * 1000} />
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

export default withHeads(TransfersPage)
