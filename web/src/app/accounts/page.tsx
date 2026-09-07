import Pager from '@/components/Pager'
import Refresh from '@/components/Refresh'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {paging} from '@/lib/paging'
import {accountsPage, primeState} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {AccountsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Accounts'}


export default async function AccountsPage(props: PageProps<'/accounts'>) {
    const sp = await props.searchParams
    const pg = paging(sp)
    const [chain, {accounts, conn, dailyStats}, {primeStates}] = await Promise.all([chainProps(), accountsPage(pg.size, pg.offset), primeState()])
    const prime = primeStates[0]

    return (
        <div>
            <Refresh />
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Accounts</h1>
            </div>
            {prime && (
                <Card size="flush" className="mt-3 flex-row flex-wrap items-center gap-x-4 gap-y-2 px-6 py-3.5">
                    <span className="text-sm font-medium text-muted-foreground">Prime key</span>
                    <AccountLink full addr={ss58Encode(prime.account.id, chain.ss58)} acc={prime.account} className="min-w-0" />
                    <span className="ml-auto text-xs text-dim">
                        {prime.since > 0 ? (
                            <>
                                since <BlockLink height={prime.since} />
                            </>
                        ) : (
                            'since genesis'
                        )}
                    </span>
                </Card>
            )}
            <Card size="flush" className="mt-3">
                <AccountsTable rows={accounts} chain={chain} issuance={dailyStats[0]?.issuanceTotal ?? '0'} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href="/accounts" />
        </div>
    )
}
