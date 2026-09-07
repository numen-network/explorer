import Pager from '@/components/Pager'
import {FilterChip} from '@/components/pills'
import {Card} from '@/components/ui/card'
import {transfersFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {TransfersTable} from './TransfersTable'
import {tabHref, type TabCtx} from './shared'


export default async function Transfers({hex, addr, label, chain, sp}: TabCtx) {
    const dir = sp.dir === 'in' || sp.dir === 'out' ? sp.dir : ''
    const pg = paging(sp, 'xpage')
    const {transfers, conn} = await transfersFor(hex, dir, pg.size, pg.offset)
    const dirHref = (d: string) => tabHref(addr, 'transfers', {dir: d})

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-muted-foreground">Direction</span>
                <FilterChip label="All" href={dirHref('')} active={!dir} />
                <FilterChip label="Out" href={dirHref('out')} active={dir === 'out'} />
                <FilterChip label="In" href={dirHref('in')} active={dir === 'in'} />
            </div>
            <Card size="flush">
                <TransfersTable rows={transfers} hex={hex} label={label} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'transfers', {dir})} pageKey="xpage" />
        </>
    )
}
