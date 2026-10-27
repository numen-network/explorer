import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {chainDbHead, chainProps, windowStart} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorsLocked, validatorsPage} from '@/lib/gql'
import {OFFENCE_DAYS} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {validatorRules} from '@/lib/validatorRules'
import {ValidatorsTable} from './table'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

export default async function ValidatorsPage(props: PageProps<'/validators'>) {
    const pg = paging(await props.searchParams)
    const [chain, head] = await Promise.all([chainProps(), chainDbHead()])
    const [data, locked] = await Promise.all([validatorsPage(windowStart(head, OFFENCE_DAYS), pg.size, pg.offset), validatorsLocked()])
    const rules = validatorRules(head, chain)

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">Validators</h1>
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-3">
                <StatTile
                    label="Validators"
                    tip="Active plus pending, capped by MaxValidators"
                    value={
                        <>
                            {fmtInt(data.active.totalCount + data.pending.totalCount)}
                            <span className="font-normal text-dim"> / {fmtInt(rules.maxValidators)}</span>
                        </>
                    }
                    chips={[
                        {text: fmtInt(data.active.totalCount), note: 'active', tone: 'pos'},
                        {text: fmtInt(data.pending.totalCount), note: 'pending', tone: 'idle'},
                        {text: fmtInt(data.all.totalCount), note: 'known', tone: 'idle'},
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
            <Card size="flush" className="mt-4">
                <ValidatorsTable rows={data.validators} chain={chain} head={head.height} rules={rules} />
            </Card>
            <Pager paging={pg} total={data.all.totalCount} href="/validators" />
        </div>
    )
}
