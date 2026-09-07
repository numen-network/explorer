import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {paging} from '@/lib/paging'
import {blocksPage} from '@/lib/gql'
import {BlocksTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Blocks'}


export default async function BlocksPage(props: PageProps<'/blocks'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    const [chain, {blocks, conn}] = await Promise.all([chainProps(), blocksPage(pg.size, pg.offset)])

    return (
        <div>
            <Refresh />
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Blocks</h1>
            </div>
            <Card size="flush" className="mt-3">
                <BlocksTable rows={blocks} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href="/blocks" />
        </div>
    )
}
