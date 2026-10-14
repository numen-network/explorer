import {BarsChart} from '@/components/charts'
import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {minedBlocks} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {MinedBlocksTable} from './MinedBlocksTable'
import {tabHref, type TabCtx} from './shared'

// the summary already reads the day rows and the block count, so the tab takes
// them from there rather than asking again
export default async function Mining({hex, addr, chain, sp, days, total}: TabCtx & {days: MinedDay[]; total: number}) {
    const pg = paging(sp)
    const {blocks} = await minedBlocks(hex, pg.size, pg.offset)
    return (
        <>
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
