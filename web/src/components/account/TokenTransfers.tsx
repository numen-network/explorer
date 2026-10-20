import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {tokenTransfersFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {TokenTransfersTable} from './TokenTransfersTable'
import {tabHref, type TabCtx} from './shared'

export default async function TokenTransfers({addr, evm, sp}: TabCtx & {evm: string}) {
    const hide = sp.hide === 'risky' ? 'risky' : ''
    const pg = paging(sp)
    const {tokenTransfers, conn} = await tokenTransfersFor(evm, !!hide, pg.size, pg.offset)

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <FilterChip label="Hide risky txns" href={tabHref(addr, 'tokens', {hide: hide ? '' : 'risky'})} active={!!hide} />
            </div>
            <Card size="flush">
                <TokenTransfersTable rows={tokenTransfers} evm={evm} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'tokens', {hide})} />
        </>
    )
}
