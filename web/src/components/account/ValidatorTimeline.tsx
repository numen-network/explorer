import Pager from '@/components/Pager'
import {TimelineList} from '@/components/timeline'
import {ValidatorStep} from '@/components/ValidatorStep'
import {validatorSteps} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {tabHref, type TabCtx} from './shared'

export default async function ValidatorTimeline({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const page = await validatorSteps(hex, pg.size, pg.offset)
    return (
        <>
            <TimelineList empty={page.steps.length === 0}>
                {page.steps.map(s => (
                    <ValidatorStep key={s.id} s={s} chain={chain} />
                ))}
            </TimelineList>
            <Pager paging={pg} total={page.all.totalCount} href={tabHref(addr, 'validator-timeline')} />
        </>
    )
}
