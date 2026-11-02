import {Card} from '@/components/ui/card'
import type {DelegationRow} from '@/lib/gql'
import {CHAIN} from '../../../../mock/fixtures/accounts.js'
import {DelegationsTable, type Sorting} from './DelegationsTable'

export const table = (rows: DelegationRow[], filtered: boolean, sort: Sorting) => (
    <Card size="flush">
        <DelegationsTable rows={rows} chain={CHAIN} filtered={filtered} sort={sort} />
    </Card>
)
