import type {ReactNode} from 'react'
import {Star, User, Users} from 'lucide-react'
import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import RetiredBadge from '@/components/RetiredBadge'
import {Badge} from '@/components/ui/badge'
import {TimelineItem, TimelineList, TimelineRows, type Tone} from '@/components/timeline'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {identityTimeline, judgementsByEvent, registrarsList, type RegistrarRow} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {callSubs, hexText, identityCallRows, type SubEntry} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {NONE} from '@/components/Detail'
import {JUDGEMENT_TONE, tabHref, type TabCtx} from './shared'


const TONE = (method: string): Tone => (/Killed|Cleared|Revoked|Removed/.test(method) ? 'neg' : method === 'JudgementGiven' ? 'pos' : 'primary')

const ICON = (method: string) => (method.startsWith('Sub') ? Users : method.startsWith('Judgement') ? Star : User)

const MONEY = /deposit|amount|fee|value/i

const rowLabel = (k: string) => {
    const spaced = k.replace(/([A-Z])/g, ' $1')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// the index is what the event carries, the account behind it is what a reader
// wants. numberOfSubs is dropped because the Subs rows spell the same thing out
const eventRows = (args: unknown, self: string, chain: ChainProps, registrars: Map<number, RegistrarRow>): [string, ReactNode][] =>
    Object.entries((args ?? {}) as Record<string, unknown>)
        .filter(([k, v]) => k !== 'numberOfSubs' && String(v).toLowerCase() !== self)
        .flatMap(([k, v]): [string, ReactNode][] => {
            const raw = String(v)
            if (k === 'registrarIndex') {
                const reg = registrars.get(Number(raw))
                const index = reg?.retiredAt != null ? <span key={k} className="flex items-center gap-2">{raw}<RetiredBadge /></span> : raw
                const rows: [string, ReactNode][] = [[rowLabel(k), index]]
                if (reg?.account) rows.push(['Registrar account', <AccountLink key={k} addr={ss58Encode(reg.account.id, chain.ss58)} acc={reg.account} />])
                return rows
            }
            if (k === 'username' && raw.startsWith('0x')) return [[rowLabel(k), hexText(raw)]]
            if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return [[rowLabel(k), <AccountLink key={k} addr={ss58Encode(raw, chain.ss58)} />]]
            if (MONEY.test(k) && /^\d+$/.test(raw)) return [[rowLabel(k), fmtBalance(raw, chain.decimals, chain.symbol)]]
            return [[rowLabel(k), raw]]
        })

const SubList = ({subs, chain}: {subs: SubEntry[]; chain: ChainProps}) => (
    <ul className="space-y-2.5">
        {subs.map(s => (
            <li key={s.addr} className="min-w-0">
                <AccountLink full addr={ss58Encode(s.addr, chain.ss58)} />
                <div className="truncate text-muted-foreground">{s.name ?? NONE}</div>
            </li>
        ))}
    </ul>
)

export default async function Timeline({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {events, conn} = await identityTimeline(hex, pg.size, pg.offset)
    const [regs, verdicts] = await Promise.all([
        events.some(e => (e.args as {registrarIndex?: unknown} | null)?.registrarIndex != null) ? registrarsList() : null,
        judgementsByEvent(events.filter(e => e.method === 'JudgementGiven').map(e => e.id)),
    ])
    const registrarBy = new Map((regs?.registrars ?? []).map(r => [r.index, r]))
    const verdictBy = new Map(verdicts.judgements.map(j => [j.id, j]))

    return (
        <>
            <TimelineList empty={events.length === 0}>
                {events.map(e => {
                    const rows = eventRows(e.args, hex, chain, registrarBy)
                    const verdict = verdictBy.get(e.id)
                    if (verdict?.kind)
                        rows.push([
                            'Judgement',
                            <Badge key="j" variant={JUDGEMENT_TONE[verdict.kind] ?? 'idle'}>
                                {verdict.kind}
                            </Badge>,
                        ])
                    if (verdict?.fee) rows.push(['Fee', fmtBalance(verdict.fee, chain.decimals, chain.symbol)])
                    if (e.call) rows.push(...identityCallRows(e.call.method, e.call.args))
                    const subs = e.call ? callSubs(e.call.method, e.call.args) : []
                    if (subs.length > 0) rows.push(['Subs', <SubList key="subs" subs={subs} chain={chain} />])
                    return (
                        <TimelineItem
                            key={e.id}
                            tone={TONE(e.method)}
                            icon={ICON(e.method)}
                            title={e.method}
                            iso={e.block.timestamp}
                            links={
                                <>
                                    <BlockLink height={e.block.height} />
                                    {e.extrinsic && <ExtrinsicLink id={e.extrinsic.id} hash={e.extrinsic.hash} />}
                                </>
                            }
                            detail={rows.length > 0 ? <TimelineRows rows={rows} /> : undefined}
                        />
                    )
                })}
            </TimelineList>
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'timeline')} />
        </>
    )
}
