import {Card} from '@/components/ui/card'
import {proxiesFor} from '@/lib/gql'
import {ProxiesTable} from './ProxiesTable'
import type {TabCtx} from './shared'

export default async function Proxies({hex, chain}: TabCtx) {
    const rel = await proxiesFor(hex)
    return (
        <div className="space-y-3">
            {rel.out.length > 0 && (
                <Card size="flush">
                    <ProxiesTable label="Delegates to" rows={rel.out} chain={chain} />
                </Card>
            )}
            {rel.in.length > 0 && (
                <Card size="flush">
                    <ProxiesTable label="Proxy for" rows={rel.in} chain={chain} />
                </Card>
            )}
        </div>
    )
}
