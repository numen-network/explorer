import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps, windowStart} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorsPage} from '@/lib/gql'
import {OFFENCE_DAYS} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {ValidatorsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

export default async function ValidatorsPage(props: PageProps<'/validators'>) {
    const pg = paging(await props.searchParams)
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const data = await validatorsPage(windowStart(head, OFFENCE_DAYS), pg.size, pg.offset)

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Validators</h1>
                <span className="text-xs text-muted-foreground">
                    {fmtInt(data.active.totalCount)} active · {fmtInt(data.all.totalCount)} known
                </span>
            </div>
            <Card size="flush" className="mt-3">
                <ValidatorsTable rows={data.validators} chain={chain} />
            </Card>
            <Pager paging={pg} total={data.all.totalCount} href="/validators" />
        </div>
    )
}
