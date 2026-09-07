import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {judgementsGiven} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {JudgementsTable} from './JudgementsTable'
import {tabHref, type TabCtx} from './shared'


export default async function Judgements({addr, chain, sp, index}: TabCtx & {index: number}) {
    const pg = paging(sp, 'jpage')
    const {judgements, conn} = await judgementsGiven(index, pg.size, pg.offset)

    return (
        <>
            <Card size="flush">
                <JudgementsTable rows={judgements} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'judgements')} pageKey="jpage" />
        </>
    )
}
