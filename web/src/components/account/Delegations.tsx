import {Card} from '@/components/ui/card'
import {delegationsOutFor} from '@/lib/gql'
import {DelegationsTable} from './DelegationsTable'
import type {TabCtx} from './shared'

export default async function Delegations({hex, chain}: TabCtx) {
    const {delegations} = await delegationsOutFor(hex)
    return (
        <Card size="flush">
            <DelegationsTable label="Delegating to" rows={delegations} chain={chain} />
        </Card>
    )
}
