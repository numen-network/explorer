import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {chainDbHead} from '@/lib/chain'
import {proxiesFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {proxyScopes} from '@/lib/proxyTypes'
import {loadRuntimes, runsRevive} from '@/lib/runtime'
import {ProxiesTable} from './ProxiesTable'
import {tabHref, type TabCtx} from './shared'

export default async function Proxies({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const [rel, head] = await Promise.all([proxiesFor(hex, pg.size, pg.offset), chainDbHead(), loadRuntimes()])
    const scopes = proxyScopes(runsRevive(head.specVersion))
    return (
        <div className="space-y-3">
            {rel.out.length > 0 && (
                <Card size="flush">
                    <ProxiesTable label="Delegates to" rows={rel.out} chain={chain} scopes={scopes} />
                </Card>
            )}
            {rel.inCount.totalCount > 0 && (
                <div>
                    <Card size="flush">
                        <ProxiesTable label="Proxy for" rows={rel.in} chain={chain} scopes={scopes} />
                    </Card>
                    <Pager paging={pg} total={rel.inCount.totalCount} href={tabHref(addr, 'proxies')} />
                </div>
            )}
        </div>
    )
}
