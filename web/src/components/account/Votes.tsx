import {Card} from '@/components/ui/card'
import {votesFor} from '@/lib/gql'
import type {TabCtx} from './shared'
import {VotesTable} from './VotesTable'

export default async function Votes({hex, chain}: TabCtx) {
    const {votes} = await votesFor(hex)
    return (
        <Card size="flush">
            <VotesTable rows={votes} chain={chain} />
        </Card>
    )
}
