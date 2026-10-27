import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {TREASURY_SOURCES, treasuryPayoutsFor, type AccountRow, type TreasurySource} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'
import {TreasuryTable} from './TreasuryTable'

const FILTER_LABEL = {Spend: 'Spends', Bounty: 'Bounties', ChildBounty: 'Child bounties'} as const

type Received = Pick<AccountRow, 'spendsReceived' | 'bountiesReceived' | 'childBountiesReceived' | 'curatorFeesReceived'>

const TOTALS: [string, keyof Received][] = [
    ['Spends', 'spendsReceived'],
    ['Bounties', 'bountiesReceived'],
    ['Child bounties', 'childBountiesReceived'],
    ['Curator fees', 'curatorFeesReceived'],
]

export default async function Treasury({hex, addr, chain, sp, received}: TabCtx & {received: Received}) {
    const pg = paging(sp)
    const source = TREASURY_SOURCES.find(s => s === sp.source) ?? ''
    const page = await treasuryPayoutsFor(hex, source, pg.size, pg.offset)
    const amount = (planck: bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />
    const total = {label: 'Total received', value: amount(TOTALS.reduce((n, [, key]) => n + BigInt(received[key]), 0n))}
    const beside = TOTALS.map(([label, key]) => ({label, value: amount(BigInt(received[key]))}))
    return (
        <>
            <StatTile {...total} beside={beside} pairs className="mb-3" />
            <FilterRow
                label="Source"
                className="mb-3"
                values={[...TREASURY_SOURCES]}
                labelOf={s => FILTER_LABEL[s as TreasurySource]}
                value={source}
                counts={page.counts}
                allCount={page.all}
                href={s => tabHref(addr, 'treasury', {source: s})}
            />
            <Card size="flush">
                <TreasuryTable rows={page.rows} chain={chain} filtered={source !== ''} />
            </Card>
            <Pager paging={pg} total={page.total} href={tabHref(addr, 'treasury', {source})} />
        </>
    )
}
