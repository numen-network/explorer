import Pager from '@/components/Pager'
import {TabNav, panelTabs} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {paging} from '@/lib/paging'
import {tokensPage} from '@/lib/gql'
import {TokensTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Tokens'}

const href = (slug: string) => `/tokens?tab=${slug}`

export default async function TokensPage(props: PageProps<'/tokens'>) {
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    const pg = paging(sp)
    await chainProps()
    const lp = tab === 'lp'
    const {tokens, plain, pairs} = await tokensPage(lp, pg.size, pg.offset)

    const list = (slug: string, total: number) => (
        <>
            <Card size="flush">
                <TokensTable rows={tokens} />
            </Card>
            <Pager paging={pg} total={total} href={href(slug)} />
        </>
    )

    const tabs = panelTabs([
        {slug: 'tokens', label: 'Tokens', count: plain.totalCount, body: () => list('tokens', plain.totalCount)},
        {slug: 'lp', label: 'LP', count: pairs.totalCount, body: () => list('lp', pairs.totalCount)},
    ], tab, href)

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">ERC20 tokens</h1>
            <div className="mt-4">
                <TabNav aria-label="Tokens" items={tabs.items} />
                <div className="mt-4">{tabs.active.body()}</div>
            </div>
        </div>
    )
}
