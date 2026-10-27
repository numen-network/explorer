import Approx from '@/components/Approx'
import {BarsChart} from '@/components/charts'
import {BlockLink} from '@/components/links'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {chainDbHead, windowStart} from '@/lib/chain'
import {fmtInt, fmtPct} from '@/lib/format'
import {latestMined, minedBlocks, minerDays} from '@/lib/gql'
import {rankMiners} from '@/lib/miners'
import {paging} from '@/lib/paging'
import {MinedBlocksTable} from './MinedBlocksTable'
import {tabHref, type TabCtx} from './shared'

const RANK_DAYS = 30

// the summary already reads the day rows and the totals, so the tab takes
// them from there rather than asking again
export default async function Mining({hex, addr, chain, sp, days, total, rewards}: TabCtx & {days: MinedDay[]; total: number; rewards: bigint}) {
    const pg = paging(sp)
    const head = await chainDbHead()
    const [{blocks}, latest, window] = await Promise.all([minedBlocks(hex, pg.size, pg.offset), latestMined(hex), minerDays(windowStart(head, RANK_DAYS)?.slice(0, 10) ?? null)])
    const {miners, totalBlocks} = rankMiners(window)
    const rank = miners.findIndex(m => m.id === hex)
    return (
        <>
            <StatTile
                label="Blocks produced"
                value={fmtInt(total)}
                beside={[
                    {
                        label: 'Cumulative rewards',
                        tip: "Production rewards plus the miner's share of fees and tips",
                        value: <Approx planck={rewards} decimals={chain.decimals} symbol={chain.symbol} breakable />,
                    },
                    {label: `${RANK_DAYS}-day ranking/share`, href: `/miners?w=${RANK_DAYS}d`, value: rank < 0 ? '—' : `#${rank + 1} / ${fmtPct(miners[rank].blocks, totalBlocks)}`},
                    {label: 'Latest block', value: <BlockLink height={latest} />},
                ]}
                pairs
                className="mb-3"
            />
            <MinedDaysChart days={days} />
            <Card size="flush" className="mt-3">
                <MinedBlocksTable rows={blocks} chain={chain} />
            </Card>
            <Pager paging={pg} total={total} href={tabHref(addr, 'mining')} />
        </>
    )
}

type MinedDay = {day: string; blocks: number}

export function MinedDaysChart({days}: {days: MinedDay[]}) {
    const chrono = [...days].reverse().slice(-30)
    return (
        <Card size="flush" className="px-5 py-4">
            <BarsChart labels={chrono.map(d => d.day.slice(5))} values={chrono.map(d => d.blocks)} height={160} />
        </Card>
    )
}
