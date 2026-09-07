import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {paging} from '@/lib/paging'
import {tokensPage} from '@/lib/gql'
import {TokensTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Tokens'}


export default async function TokensPage(props: PageProps<'/tokens'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    await chainProps()
    const {tokens, conn} = await tokensPage(pg.size, pg.offset)

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">ERC20 tokens</h1>
                <span className="text-xs text-muted-foreground">{fmtInt(conn.totalCount)} contracts</span>
            </div>
            <Card size="flush" className="mt-3">
                <TokensTable rows={tokens} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href="/tokens" />
        </div>
    )
}
