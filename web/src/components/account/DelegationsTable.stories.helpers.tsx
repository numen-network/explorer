import {Card} from '@/components/ui/card'
import type {DelegationRow} from '@/lib/gql'
import {CHAIN} from '../../../../mock/fixtures/accounts.js'
import {DelegationsTable} from './DelegationsTable'

export const table = (label: string, rows: DelegationRow[], filtered?: boolean) => (
    <Card size="flush">
        <DelegationsTable label={label} rows={rows} chain={CHAIN} filtered={filtered} />
    </Card>
)
