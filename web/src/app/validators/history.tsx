import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import SearchBox from '@/components/SearchBox'
import {TimelineList} from '@/components/timeline'
import {ValidatorStep} from '@/components/ValidatorStep'
import {loadSearch} from '@/lib/actionFilters'
import type {ChainProps, DbHead} from '@/lib/chain'
import {accountSearch, validatorHistory} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {palletEvents} from '@/lib/runtime'

type SearchParams = Record<string, string | string[] | undefined>

export default async function ValidatorHistory({sp, chain, head}: {sp: SearchParams; chain: ChainProps; head: DbHead}) {
    const pg = paging(sp)
    const events = palletEvents(head.specVersion, 'Validator')
    const event = events.includes(String(sp.event)) ? String(sp.event) : ''
    const q = loadSearch(sp).q.trim()
    const history = await validatorHistory(event, accountSearch(q, chain.ss58), pg.size, pg.offset)
    const href = (e: string) => `/validators?${new URLSearchParams({tab: 'history', ...(e && {event: e}), ...(q && {q})})}`
    return (
        <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <FilterSelect label="Event" values={events} value={event} href={href} />
                <SearchBox placeholder="Search identity, address" className="w-full sm:w-90" />
            </div>
            <TimelineList empty={history.steps.length === 0}>
                {history.steps.map(s => (
                    <ValidatorStep key={s.id} s={s} account={s.account} chain={chain} />
                ))}
            </TimelineList>
            <Pager paging={pg} total={history.conn.totalCount} href={href(event)} />
        </>
    )
}
