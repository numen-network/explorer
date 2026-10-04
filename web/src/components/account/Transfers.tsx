import Pager from '@/components/Pager'
import {FilterRow} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {transfersFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {TransfersTable} from './TransfersTable'
import {tabHref, type TabCtx} from './shared'

const DIRECTION_LABEL: Record<string, string> = {out: 'Out', in: 'In'}

export default async function Transfers({hex, addr, chain, sp}: TabCtx) {
    const dir = sp.dir === 'in' || sp.dir === 'out' ? sp.dir : ''
    const pg = paging(sp)
    const {transfers, conn} = await transfersFor(hex, dir, pg.size, pg.offset)
    const dirHref = (d: string) => tabHref(addr, 'transfers', {dir: d})

    return (
        <>
            <FilterRow label="Direction" className="mb-3" values={Object.keys(DIRECTION_LABEL)} labelOf={d => DIRECTION_LABEL[d]} value={dir} href={dirHref} />
            <Card size="flush">
                <TransfersTable rows={transfers} hex={hex} chain={chain} filtered={!!dir} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'transfers', {dir})} />
        </>
    )
}
