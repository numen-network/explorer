import Approx from '@/components/Approx'
import {NONE} from '@/components/Detail'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {BlockLink} from '@/components/links'
import {Card} from '@/components/ui/card'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {accountRefs, judgementsByEvent, seatEvents, type RegistrarRow} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {RegistrarEventsTable} from './RegistrarEventsTable'
import {tabHref, type TabCtx} from './shared'

export function RegistrarTile({r, chain}: {r: RegistrarRow; chain: ChainProps}) {
    return (
        <StatTile
            label="Registrar"
            value={`#${r.index}`}
            beside={[
                {label: 'Fee', value: r.fee != null ? <Approx planck={r.fee} decimals={chain.decimals} symbol={chain.symbol} breakable /> : NONE},
                {label: 'Requests received', value: fmtInt(r.requestCount)},
                {label: 'Judgements given', value: fmtInt(r.givenCount)},
                {label: 'Last judgement', value: r.lastJudgementBlock != null ? <BlockLink height={r.lastJudgementBlock} /> : NONE},
                {label: 'Added', value: r.addedAt != null ? <BlockLink height={r.addedAt} /> : NONE},
            ]}
            pairs
        />
    )
}

export default async function Registrar({hex, addr, chain, sp, r}: TabCtx & {r: RegistrarRow}) {
    const pg = paging(sp)
    const {events, conn} = await seatEvents(r.index, pg.size, pg.offset)
    const rows = events.map(e => ({...e, who: (e.args.who ?? e.args.target)!}))
    const [refs, verdicts] = await Promise.all([
        accountRefs([...new Set(rows.map(e => e.who))]),
        judgementsByEvent(events.filter(e => e.method === 'JudgementGiven').map(e => e.id)),
    ])
    const refBy = new Map(refs.accounts.map(a => [a.id, a]))
    const verdictBy = new Map(verdicts.judgements.map(j => [j.id, j.kind]))

    return (
        <>
            <RegistrarTile r={r} chain={chain} />
            <Card size="flush" className="mt-3">
                <RegistrarEventsTable rows={rows.map(e => ({...e, acc: refBy.get(e.who), judgement: verdictBy.get(e.id) ?? null}))} hex={hex} chain={chain} />
            </Card>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'registrar')} />
        </>
    )
}
