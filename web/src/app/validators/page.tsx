import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import {FilterSelect} from '@/components/pills'
import SearchBox from '@/components/SearchBox'
import StatTile from '@/components/StatTile'
import {TabNav, panelTabs} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {loadValidatorFilters, VALIDATOR_SORTS, VALIDATOR_STATES, type ValidatorSort, type ValidatorSortBy} from '@/lib/actionFilters'
import {chainDbHead, chainProps, windowStart, type ChainProps, type DbHead} from '@/lib/chain'
import {camelLabel, fmtInt} from '@/lib/format'
import {accountSearch, validatorsLocked, validatorsPage, validatorsSummary} from '@/lib/gql'
import {OFFENCE_DAYS} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {validatorRules, type ValidatorRules} from '@/lib/validatorRules'
import ValidatorHistory from './history'
import ValidatorSessions from './sessions'
import {ValidatorsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

type SearchParams = Record<string, string | string[] | undefined>

async function ValidatorList({sp, chain, head, rules}: {sp: SearchParams; chain: ChainProps; head: DbHead; rules: ValidatorRules}) {
    const pg = paging(sp)
    const {q, status, sort: by, order: dir} = loadValidatorFilters(sp)
    const query = q.trim()
    const sort = by ? {by, dir} : null
    const data = await validatorsPage(windowStart(head, OFFENCE_DAYS), status, accountSearch(query, chain.ss58), sort, pg.size, pg.offset)
    // a new order or status starts over at the first page
    const href = (state: string, order: ValidatorSort | null = sort) => {
        const qs = new URLSearchParams({...(state && {status: state}), ...(query && {q: query}), ...(order && {sort: order.by, order: order.dir})}).toString()
        return qs ? `/validators?${qs}` : '/validators'
    }
    const hrefs = Object.fromEntries(VALIDATOR_SORTS.map(s => [s, href(status ?? '', {by: s, dir: s === by && dir === 'desc' ? 'asc' : 'desc'})])) as Record<ValidatorSortBy, string>
    return (
        <>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <FilterSelect label="Status" values={[...VALIDATOR_STATES]} labelOf={camelLabel} counts={data.perState} allCount={data.all} value={status ?? ''} href={href} />
                <SearchBox placeholder="Search identity, address" className="w-full sm:w-90" />
            </div>
            <Card size="flush">
                <ValidatorsTable rows={data.rows} chain={chain} head={head.height} rules={rules} sorting={{sort, hrefs}} filtered={status != null || query !== ''} />
            </Card>
            <Pager paging={pg} total={data.total} href={href(status ?? '')} />
        </>
    )
}

export default async function ValidatorsPage(props: PageProps<'/validators'>) {
    const sp = await props.searchParams
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const [sum, locked] = await Promise.all([validatorsSummary(), validatorsLocked()])
    const rules = validatorRules(head, chain)

    const tabs = panelTabs(
        [
            {slug: 'validators', label: 'Validators', count: sum.all.totalCount, body: () => <ValidatorList sp={sp} chain={chain} head={head} rules={rules} />},
            {slug: 'history', label: 'History', count: sum.history.totalCount, body: () => <ValidatorHistory sp={sp} chain={chain} head={head} />},
            {slug: 'sessions', label: 'Sessions', count: sum.sessions.totalCount, body: () => <ValidatorSessions sp={sp} chain={chain} head={head} total={sum.sessions.totalCount} />},
        ],
        String(sp.tab ?? ''),
        slug => `/validators?tab=${slug}`
    )

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">Validators</h1>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                <StatTile
                    label="Validators"
                    tip="Active plus pending, capped by MaxValidators"
                    value={
                        <>
                            {fmtInt(sum.active.totalCount + sum.pending.totalCount)}
                            <span className="font-normal text-dim"> / {fmtInt(rules.maxValidators)}</span>
                        </>
                    }
                    chips={[
                        {text: fmtInt(sum.active.totalCount), note: 'active', tone: 'pos'},
                        {text: fmtInt(sum.pending.totalCount), note: 'pending', tone: 'idle'},
                        {text: fmtInt(sum.all.totalCount), note: 'known', tone: 'idle'},
                    ]}
                />
                <StatTile label="Total locked" value={<Approx planck={locked} decimals={chain.decimals} symbol={chain.symbol} breakable />} />
                <StatTile
                    label="Registration lock"
                    value="By invitation"
                    chips={[
                        {text: rules.lockDuration, note: 'lock duration', tone: 'idle'},
                        {text: rules.renewEvery, note: 'renewal interval', tone: 'idle'},
                    ]}
                />
            </div>
            <div className="mt-4">
                <TabNav aria-label="Validators" items={tabs.items} />
                <div className="mt-4">{tabs.active.body()}</div>
            </div>
        </div>
    )
}
