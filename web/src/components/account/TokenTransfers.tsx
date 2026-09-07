import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {tokenTransfersFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {TokenTransfersTable} from './TokenTransfersTable'
import {tabHref, type TabCtx} from './shared'


export default async function TokenTransfers({addr, evm, sp}: TabCtx & {evm: string}) {
    const pg = paging(sp, 'kpage')
    const {tokenTransfers, conn} = await tokenTransfersFor(evm, pg.size, pg.offset)

    return (
        <>
            <Card size="flush">
                <TokenTransfersTable rows={tokenTransfers} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'tokens')} pageKey="kpage" />
        </>
    )
}
