import type {ReactNode} from 'react'
import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {TimeCell} from '@/components/TimeCell'
import type {ChainProps} from '@/lib/chain'
import {hexBytes} from '@/lib/digest'
import {fmtBalance} from '@/lib/format'
import {identityTimeline, judgementsByEvent, registrarsList, type AccountRef} from '@/lib/gql'
import {callSubs, identityCallRows, type SubEntry} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {JUDGEMENT_TONE, NONE, num, tabHref, type TabCtx} from './shared'

const PAGE = 25

const TONE = (method: string) =>
    /Killed|Cleared|Revoked|Removed/.test(method)
        ? 'bg-neg-soft text-neg'
        : method === 'JudgementGiven'
          ? 'bg-pos-soft text-pos'
          : 'bg-accent-soft text-accent'

const ICON = (method: string) =>
    method.startsWith('Sub')
        ? 'M5.8 7.4a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Zm5.6.6a1.8 1.8 0 1 0 0-3.6 1.8 1.8 0 0 0 0 3.6M1.6 13.4a4.2 4.2 0 0 1 8.4 0M11.8 9.8a3.2 3.2 0 0 1 2.6 3.6'
        : method.startsWith('Judgement')
          ? 'M8 2.4l1.7 3.4 3.8.6-2.8 2.6.7 3.7L8 10.9l-3.4 1.8.7-3.7-2.8-2.6 3.8-.6z'
          : 'M8 7.8a2.6 2.6 0 1 0 0-5.2 2.6 2.6 0 0 0 0 5.2ZM3 13.6a5 5 0 0 1 10 0'

const MONEY = /deposit|amount|fee|value/i

const rowLabel = (k: string) => {
    const spaced = k.replace(/([A-Z])/g, ' $1')
    return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

// the index is what the event carries, the account behind it is what a reader
// wants. numberOfSubs is dropped because the Subs rows spell the same thing out
const eventRows = (args: unknown, self: string, chain: ChainProps, registrars: Map<number, AccountRef>): [string, ReactNode][] =>
    Object.entries((args ?? {}) as Record<string, unknown>)
        .filter(([k, v]) => k !== 'numberOfSubs' && String(v).toLowerCase() !== self)
        .flatMap(([k, v]): [string, ReactNode][] => {
            const raw = String(v)
            if (k === 'registrarIndex') {
                const acc = registrars.get(Number(raw))
                const rows: [string, ReactNode][] = [[rowLabel(k), raw]]
                if (acc) rows.push(['Registrar account', <AccountLink key={k} addr={ss58Encode(acc.id, chain.ss58)} acc={acc} />])
                return rows
            }
            if (k === 'username' && raw.startsWith('0x')) return [[rowLabel(k), new TextDecoder().decode(hexBytes(raw))]]
            if (/^0x[0-9a-fA-F]{64}$/.test(raw)) return [[rowLabel(k), <AccountLink key={k} addr={ss58Encode(raw, chain.ss58)} />]]
            if (MONEY.test(k) && /^\d+$/.test(raw)) return [[rowLabel(k), fmtBalance(raw, chain.decimals, chain.symbol)]]
            return [[rowLabel(k), raw]]
        })

const SubList = ({subs, chain}: {subs: SubEntry[]; chain: ChainProps}) => (
    <ul className="space-y-2.5">
        {subs.map(s => (
            <li key={s.addr} className="min-w-0">
                <AccountLink full addr={ss58Encode(s.addr, chain.ss58)} />
                <div className="truncate text-sub">{s.name ?? NONE}</div>
            </li>
        ))}
    </ul>
)

export default async function Timeline({hex, addr, chain, sp}: TabCtx) {
    const page = num(sp, 'tpage')
    const {events, conn} = await identityTimeline(hex, PAGE, (page - 1) * PAGE)
    const [regs, verdicts] = await Promise.all([
        events.some(e => (e.args as {registrarIndex?: unknown} | null)?.registrarIndex != null) ? registrarsList() : null,
        judgementsByEvent(events.filter(e => e.method === 'JudgementGiven').map(e => e.id)),
    ])
    const registrarBy = new Map((regs?.registrars ?? []).filter(r => r.account).map(r => [r.index, r.account!]))
    const verdictBy = new Map(verdicts.judgements.map(j => [j.id, j]))

    return (
        <>
            <div className="card px-7 py-1">
                {events.length === 0 && <div className="py-5 text-sm text-sub">None</div>}
                <ol className="ml-3 border-l border-edge">
                    {events.map(e => {
                        const rows = eventRows(e.args, hex, chain, registrarBy)
                        const verdict = verdictBy.get(e.id)
                        if (verdict?.kind) rows.push(['Judgement', <Tag key="j" text={verdict.kind} tone={JUDGEMENT_TONE[verdict.kind] ?? 'idle'} />])
                        if (verdict?.fee) rows.push(['Fee', fmtBalance(verdict.fee, chain.decimals, chain.symbol)])
                        if (e.call) rows.push(...identityCallRows(e.call.method, e.call.args))
                        const subs = e.call ? callSubs(e.call.method, e.call.args) : []
                        if (subs.length > 0) rows.push(['Subs', <SubList key="subs" subs={subs} chain={chain} />])
                        return (
                            <li key={e.id} className="relative grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-4 border-t border-edge py-6 pl-9 first:border-t-0 lg:grid-cols-[300px_minmax(0,1fr)]">
                                <span className={`absolute top-6 -left-[14px] grid size-7 place-items-center rounded-full ${TONE(e.method)}`}>
                                    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d={ICON(e.method)} />
                                    </svg>
                                </span>
                                <div className="min-w-0">
                                    <div className="text-sm font-medium">{e.method}</div>
                                    <div className="mt-1 text-xs text-sub">
                                        <TimeCell iso={e.block.timestamp} cycle />
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                                        <BlockLink height={e.block.height} />
                                        {e.extrinsic && <ExtrinsicLink id={e.extrinsic.id} hash={e.extrinsic.hash} />}
                                    </div>
                                </div>
                                {rows.length > 0 && (
                                    <dl className="space-y-2 text-sm">
                                        {rows.map(([label, value]) => (
                                            <div key={label} className="flex gap-4">
                                                <dt className="w-40 shrink-0 text-sub">{label}</dt>
                                                <dd className="min-w-0 break-all">{value}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                )}
                            </li>
                        )
                    })}
                </ol>
            </div>
            {conn.totalCount > PAGE && <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => tabHref(addr, 'timeline', {tpage: n})} />}
        </>
    )
}
