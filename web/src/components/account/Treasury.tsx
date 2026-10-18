import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {TREASURY_SOURCES, treasuryPayoutAmounts, treasuryPayoutsFor, type TreasuryPayoutRow, type TreasurySource} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'
import {TreasuryTable} from './TreasuryTable'

const FILTER_LABEL = {Spend: 'Spends', Bounty: 'Bounties', ChildBounty: 'Child bounties'} as const

const TOTALS: [string, (p: Pick<TreasuryPayoutRow, 'source' | 'role'>) => boolean][] = [
    ['Total received', () => true],
    ['Spends', p => p.source === 'Spend'],
    ['Bounties', p => p.source === 'Bounty' && p.role === 'Beneficiary'],
    ['Child bounties', p => p.source === 'ChildBounty' && p.role === 'Beneficiary'],
    ['Curator fees', p => p.role === 'Curator'],
]

export default async function Treasury({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const source = TREASURY_SOURCES.find(s => s === sp.source) ?? ''
    const [page, amounts] = await Promise.all([treasuryPayoutsFor(hex, source, pg.size, pg.offset), treasuryPayoutAmounts(hex)])
    const [total, ...beside] = TOTALS.map(([label, counts]) => ({
        label,
        value: <Approx planck={amounts.filter(counts).reduce((n, p) => n + BigInt(p.amount), 0n)} decimals={chain.decimals} symbol={chain.symbol} breakable />,
    }))
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
