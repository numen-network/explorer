import Link from 'next/link'
import {ExtrinsicsTable} from '@/components/ExtrinsicsTable'
import Pager from '@/components/Pager'
import {Jump} from '@/components/links'
import {Card} from '@/components/ui/card'
import {extrinsicsPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'


export default async function Extrinsics({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {rows, total, leaves} = await extrinsicsPage(pg.size, pg.offset, {signer: hex}, [])

    return (
        <>
            <Card size="flush">
                <ExtrinsicsTable rows={rows} leaves={Object.fromEntries(leaves)} chain={chain} view="account" />
            </Card>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
                <Link href={`/extrinsics?signer=${addr}`} className="text-primary hover:underline">
                    Search all extrinsics from this account <Jump />
                </Link>
                <Pager className="" paging={pg} total={total} href={tabHref(addr, 'extrinsics')} />
            </div>
        </>
    )
}
