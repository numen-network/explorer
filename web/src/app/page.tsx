import Link from 'next/link'
import BlocksRail, {type BlockCard} from '@/components/BlocksRail'
import Refresh from '@/components/Refresh'
import Section from '@/components/Section'
import StatTile, {type StatChip} from '@/components/StatTile'
import TimeAgo from '@/components/TimeAgo'
import {TimeCell} from '@/components/TimeCell'
import {LinesChart} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import {ExtrinsicLink, Jump} from '@/components/links'
import {StatusDot} from '@/components/pills'
import {CallPill} from '@/components/calls'
import {StatusBadge} from '@/components/referenda'
import {chainHeads, chainProps} from '@/lib/chain'
import {fmtBalance, fmtCompact, fmtInt, planckToNum} from '@/lib/format'
import {blockTimes, homeCounts, homeData, type DailyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

// both lists hold five slots so the pair stays level however little data lands
const ROW_H = 'h-[66px]'
const LIST_H = 'min-h-[332px]'

const trackLabel = (name: string) => name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

function StatusRow({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex items-center justify-between py-[9px] text-sm">
            <dt className="text-sub">{label}</dt>
            <dd className="font-mono">{children}</dd>
        </div>
    )
}

function Bar({ratio}: {ratio: number}) {
    return (
        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-bg">
            <div className="h-full rounded-full bg-accent" style={{width: `${Math.min(100, ratio * 100).toFixed(1)}%`}} />
        </div>
    )
}

export default async function Home() {
    const sinceDay = new Date(Date.now() - 31 * 86400000).toISOString().slice(0, 10)
    const [props, heads, data] = await Promise.all([chainProps(), chainHeads(), homeData(sinceDay)])
    const days = data.dailyStats.filter(d => !d.id.startsWith('1970'))
    const today: DailyRow | undefined = days[0]
    const yesterday: DailyRow | undefined = days[1]
    const dayAt = (i: number) => days[Math.min(i, days.length - 1)]

    const fullDays = days.slice(1, 8)
    const perDay = fullDays.length ? Math.round(fullDays.reduce((a, d) => a + d.blocks, 0) / fullDays.length) : Math.max(1, today?.blocks ?? 1)
    const [counts, refTimes] = await Promise.all([
        homeCounts(Math.max(0, heads.best - perDay), Math.max(0, heads.best - perDay * 30)),
        blockTimes([...new Set(data.referendums.map(r => r.submittedAt))]),
    ])
    const refStamps = new Map(refTimes.blocks.map(b => [b.height, b.timestamp]))

    const blockTime = today && today.blocks > 1 ? (Date.parse(today.tsLast) - Date.parse(today.tsFirst)) / 1000 / (today.blocks - 1) : null

    const sessionIdx = data.sessionHead[0]?.lastActiveSession ?? 0
    const period = props.sessionLength
    const inSession = period > 0 ? ((heads.best - props.sessionOffset) % period) + 1 : 0

    const dbHead = data.blocks[0]?.height ?? 0
    const indexing = heads.best - dbHead > 50

    const cards: BlockCard[] = data.minedObjects.map(o => ({
        height: o.block.height,
        hash: o.block.hash,
        timestamp: o.block.timestamp,
        finalized: o.block.finalized,
        extrinsicCount: o.block.extrinsicCount,
        eventCount: o.block.eventCount,
        workHash: o.block.workHash,
        minerAddr: o.block.author ? ss58Encode(o.block.author.id, props.ss58) : null,
        minerAcc: o.block.author ?? null,
        protocol: o.protocol,
        vertices: o.vertices,
    }))
    const faces = data.topology[0]?.faces ?? ''

    const chrono = [...days].reverse().slice(-30)
    const txLabels = chrono.map(d => d.id.slice(5))
    const volSeries = chrono.map(d => planckToNum(d.transferVolume, props.decimals))
    const cntSeries = chrono.map(d => d.transfers)


    const chip = (n: number, note: string): StatChip => ({
        text: n === 0 ? '0' : `${n > 0 ? '+' : '−'}${fmtCompact(Math.abs(n))}`,
        note,
        tone: n > 0 ? 'pos' : n < 0 ? 'neg' : 'idle',
    })
    const pctChip = (cur: number, prev: number, note: string): StatChip => {
        const p = prev > 0 ? ((cur - prev) / prev) * 100 : 0
        if (Math.abs(p) < 0.05) return {text: '0%', note, tone: 'idle'}
        return {text: `${p > 0 ? '+' : ''}${p.toFixed(1)}%`, note, tone: p > 0 ? 'pos' : 'neg'}
    }
    const sum30 = (get: (d: DailyRow) => number) => days.slice(0, 30).reduce((a, d) => a + get(d), 0)
    const stockChips = (get: (d: DailyRow) => number) =>
        today ? [chip(yesterday ? get(today) - get(yesterday) : 0, '24h'), chip(get(today) - get(dayAt(30)), '30d')] : undefined
    const iss = (d: DailyRow) => planckToNum(d.issuanceTotal, props.decimals)
    const act = (d: DailyRow) => iss(d) - planckToNum(d.issuanceInactive, props.decimals)
    const pot = (d: DailyRow) => planckToNum(d.treasuryPot, props.decimals)

    const minersByDay = new Map<string, Set<string>>()
    for (const r of data.minerDays) {
        const set = minersByDay.get(r.day) ?? new Set<string>()
        set.add(r.account.id)
        minersByDay.set(r.day, set)
    }
    const minersOn = (d?: DailyRow) => (d ? (minersByDay.get(d.id)?.size ?? 0) : 0)
    const curDifficulty = data.blocks[0] ? Number(data.blocks[0].difficulty) : today ? Number(today.difficultyClose) : 0

    return (
        <div>
            <Refresh ms={10000} />

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <div className="card px-5 py-4">
                    <h2 className="text-[15px] font-semibold">Daily transactions</h2>
                    <div className="mt-2">
                        <LinesChart
                            labels={txLabels}
                            dualAxis
                            height={208}
                            series={[
                                {name: `Volume (${props.symbol})`, values: volSeries},
                                {name: 'Count', values: cntSeries},
                            ]}
                        />
                    </div>
                </div>

                <div className="card px-5 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[15px] font-semibold">Network status</h2>
                        <span className="flex items-center gap-1.5 text-xs">
                            <StatusDot tone={indexing ? 'warn' : 'pos'} />
                            <span className={indexing ? 'text-warn' : 'text-pos'}>{indexing ? 'Indexing' : 'Operational'}</span>
                        </span>
                    </div>
                    {indexing && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-sub">
                                <span>Catching up</span>
                                <span className="font-mono">
                                    {fmtInt(dbHead)} / {fmtInt(heads.best)}
                                </span>
                            </div>
                            <Bar ratio={dbHead / Math.max(1, heads.best)} />
                        </div>
                    )}
                    <dl className="mt-1 divide-y divide-edge">
                        <StatusRow label="Best block">
                            <Link href={`/block/${heads.best}`} className="text-accent hover:underline">
                                {fmtInt(heads.best)}
                            </Link>
                        </StatusRow>
                        <StatusRow label="Finalized">{fmtInt(heads.finalized)}</StatusRow>
                        <StatusRow label="Avg block time">{blockTime ? `${blockTime.toFixed(1)}s` : '—'}</StatusRow>
                        <StatusRow label="Validators">{fmtInt(data.validators.totalCount)}</StatusRow>
                        <StatusRow label="Session">#{fmtInt(sessionIdx)}</StatusRow>
                        <StatusRow label="EVM chain id">{props.evmChainId}</StatusRow>
                    </dl>
                    {period > 0 && (
                        <div>
                            <div className="flex justify-between text-xs text-sub">
                                <span>
                                    Block {fmtInt(inSession)} / {period}
                                </span>
                            </div>
                            <Bar ratio={inSession / period} />
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatTile
                    label="Signed extrinsics" href="/charts/extrinsics-total"
                    value={fmtInt(today?.cumExtrinsicsSigned ?? '0')}
                    chips={today ? [chip(today.extrinsicsSigned, '24h'), chip(sum30(d => d.extrinsicsSigned), '30d')] : undefined}
                />
                <StatTile
                    label="Transfers" href="/charts/transfers-total"
                    value={fmtInt(today?.cumTransfers ?? '0')}
                    chips={today ? [chip(today.transfers, '24h'), chip(sum30(d => d.transfers), '30d')] : undefined}
                />
                <StatTile
                    label="EVM txs" href="/charts/evm-transactions"
                    value={fmtInt(data.evmTotal.totalCount)}
                    chips={today ? [chip(today.evmTxs, '24h'), chip(sum30(d => d.evmTxs), '30d')] : undefined}
                />
                <StatTile
                    label="Accounts" href="/charts/accounts"
                    value={fmtInt(data.accounts.totalCount)}
                    chips={[chip(counts.fresh24.totalCount, '24h'), chip(counts.fresh30.totalCount, '30d')]}
                />
                <StatTile
                    label="Miners" href="/charts/miners"
                    value={fmtInt(minersOn(today))}
                    chips={today ? [chip(minersOn(today) - minersOn(yesterday), '24h'), chip(minersOn(today) - minersOn(dayAt(30)), '30d')] : undefined}
                />
                <StatTile
                    label="Total issuance" href="/charts/issuance"
                    value={`${fmtCompact(planckToNum(today?.issuanceTotal ?? '0', props.decimals))} ${props.symbol}`}
                    chips={stockChips(iss)}
                />
                <StatTile label="Active issuance" href="/charts/active-issuance" value={`${fmtCompact(today ? act(today) : 0)} ${props.symbol}`} chips={stockChips(act)} />
                <StatTile label="Treasury pot" href="/charts/treasury" value={`${fmtCompact(today ? pot(today) : 0)} ${props.symbol}`} chips={stockChips(pot)} />
                <StatTile
                    label="Referenda" href="/charts/referenda"
                    value={fmtInt(data.refsTotal.totalCount)}
                    chips={[chip(counts.refs24.totalCount, '24h'), chip(counts.refs30.totalCount, '30d')]}
                />
                <StatTile
                    label="Difficulty" href="/charts/difficulty"
                    value={curDifficulty > 0 ? fmtCompact(curDifficulty) : '—'}
                    chips={
                        today
                            ? [
                                  pctChip(curDifficulty, yesterday ? Number(yesterday.difficultyClose) : curDifficulty, '24h'),
                                  pctChip(curDifficulty, Number(dayAt(30).difficultyClose), '30d'),
                              ]
                            : undefined
                    }
                />
            </div>

            <Section title="Latest blocks" more="/blocks">
                <BlocksRail cards={cards} faces={faces} />
            </Section>

            <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                    <div className="mb-3 flex items-baseline justify-between gap-4">
                        <h2 className="text-[17px] font-semibold whitespace-nowrap">Transfers</h2>
                        <Link href="/transfers" className="pr-2 text-sm whitespace-nowrap text-accent hover:underline">
                            View all <Jump />
                        </Link>
                    </div>
                    <div className={`card divide-y divide-edge ${LIST_H}`}>
                        {data.transfers.length === 0 && <div className="px-5 py-6 text-sm text-sub">No transfers yet.</div>}
                        {data.transfers.map(t => (
                            <div key={t.id} className="flex flex-col justify-center gap-1.5 px-5 py-3 sm:h-[66px] sm:flex-row sm:items-center sm:gap-3 sm:py-0">
                                <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:w-[230px] sm:shrink-0">
                                    <span className="shrink-0">
                                        {t.extrinsic ? <ExtrinsicLink id={t.extrinsic.id} hash={t.extrinsic.hash} /> : <span className="font-mono text-sub">—</span>}
                                    </span>
                                    <div className="text-[11px] whitespace-nowrap text-sub sm:mt-0.5">
                                        <TimeCell iso={t.timestamp} cycle />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 text-[12.5px]">
                                    <div className="flex min-w-0 items-baseline gap-2">
                                        <span className="w-9 shrink-0 text-[11px] text-faint">From</span>
                                        <AccountLink addr={ss58Encode(t.from.id, props.ss58)} acc={t.from} className="min-w-0" />
                                    </div>
                                    <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                                        <span className="w-9 shrink-0 text-[11px] text-faint">To</span>
                                        <AccountLink addr={ss58Encode(t.to.id, props.ss58)} acc={t.to} className="min-w-0" />
                                    </div>
                                </div>
                                <div className="flex shrink-0 items-baseline justify-between gap-3 sm:block sm:text-right">
                                    <div className="font-mono text-sm">{fmtBalance(t.amount, props.decimals, props.symbol)}</div>
                                    <div className="flex justify-end sm:mt-1">
                                        <CallPill call={t.call} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        </div>
                </div>
                <div className="min-w-0">
                    <div className="mb-3 flex items-baseline justify-between gap-4">
                        <h2 className="text-[17px] font-semibold whitespace-nowrap">Referenda</h2>
                        <Link href="/governance" className="pr-2 text-sm whitespace-nowrap text-accent hover:underline">
                            View all <Jump />
                        </Link>
                    </div>
                    <div className={`card divide-y divide-edge ${LIST_H}`}>
                        {data.referendums.length === 0 && <div className="px-5 py-6 text-sm text-sub">No referenda yet.</div>}
                        {data.referendums.map(r => {
                            const iso = refStamps.get(r.submittedAt)
                            return (
                                <div key={r.id} className={`${ROW_H} flex items-center gap-3 px-5`}>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex min-w-0 items-baseline gap-2">
                                            <Link href={`/referendum/${r.index}`} className="shrink-0 font-mono text-accent hover:underline">
                                                #{r.index}
                                            </Link>
                                            <span className="truncate text-[13px]">
                                                {r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}
                                            </span>
                                        </div>
                                        <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[11px] text-sub">
                                            <span className="truncate">{trackLabel(r.track.name)}</span>
                                            {iso && (
                                                <>
                                                    <span className="text-faint">·</span>
                                                    <TimeAgo iso={iso} />
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <div className="font-mono text-sm">
                                            {r.proposalAmount != null ? (
                                                fmtBalance(r.proposalAmount, props.decimals, props.symbol)
                                            ) : (
                                                <span className="text-sub">{r.proposalCall?.split('.')[1] ?? '—'}</span>
                                            )}
                                        </div>
                                        <div className="mt-1 flex justify-end">
                                            <StatusBadge status={r.status} />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    </div>
            </div>

        </div>
    )
}
