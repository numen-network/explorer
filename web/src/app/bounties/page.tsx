import {BountyTable} from '@/components/BountyTable'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {bountiesPage} from '@/lib/gql'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Bounties'}

export default async function BountiesPage() {
    const [chain, data] = await Promise.all([chainProps(), bountiesPage(100, 0, {status: []}, {})])
    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Bounties</h1>
                <span className="text-xs text-muted-foreground">{fmtInt(data.total)} total</span>
            </div>
            <Card size="flush" className="mt-3">
                <BountyTable rows={data.rows} chain={chain} />
            </Card>
        </div>
    )
}
