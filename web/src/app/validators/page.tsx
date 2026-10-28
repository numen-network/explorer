import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabNav, panelTabs} from '@/components/Tabs'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps, windowStart, type ChainProps, type DbHead} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorsLocked, validatorsPage, validatorsSummary} from '@/lib/gql'
import {OFFENCE_DAYS} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {validatorRules, type ValidatorRules} from '@/lib/validatorRules'
import ValidatorHistory from './history'
import ValidatorSessions from './sessions'
import {ValidatorsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

type SearchParams = Record<string, string | string[] | undefined>

async function ValidatorList({sp, chain, head, rules, total}: {sp: SearchParams; chain: ChainProps; head: DbHead; rules: ValidatorRules; total: number}) {
    const pg = paging(sp)
    const data = await validatorsPage(windowStart(head, OFFENCE_DAYS), pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <ValidatorsTable rows={data.validators} chain={chain} head={head.height} rules={rules} />
            </Card>
            <Pager paging={pg} total={total} href="/validators" />
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
            {slug: 'validators', label: 'Validators', count: sum.all.totalCount, body: () => <ValidatorList sp={sp} chain={chain} head={head} rules={rules} total={sum.all.totalCount} />},
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
