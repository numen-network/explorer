import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps} from '@/lib/chain'
import {datedOrGenesis} from '@/lib/config'
import {paging} from '@/lib/paging'
import {blocksPage} from '@/lib/gql'
import {BlocksTable} from './table'
import {withHeads} from '@/components/withHeads'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Blocks'}


async function BlocksPage(props: PageProps<'/blocks'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const {blocks, conn} = await blocksPage(pg.size, pg.offset, head.height)

    return (
        <div>
            <Refresh ms={chain.blockTime * 1000} />
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Blocks</h1>
            </div>
            <Card size="flush" className="mt-3">
                <BlocksTable rows={blocks.map(b => ({...b, timestamp: datedOrGenesis(b.timestamp, b.height, chain.evmChainId)}))} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href="/blocks" />
        </div>
    )
}

export default withHeads(BlocksPage)
