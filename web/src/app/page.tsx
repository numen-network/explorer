import Link from 'next/link'
import AddressText from '@/components/AddressText'
import BlocksRail, {type BlockCard} from '@/components/BlocksRail'
import CopyBtn from '@/components/CopyBtn'
import {DetailRow} from '@/components/Detail'
import Refresh from '@/components/Refresh'
import Section from '@/components/Section'
import StatTile, {type StatChip} from '@/components/StatTile'
import TimeAgo from '@/components/TimeAgo'
import {TimeCell} from '@/components/TimeCell'
import {LinesChart} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import {ExtrinsicLink, Jump} from '@/components/links'
import {StatusDot} from '@/components/pills'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {CallPill} from '@/components/calls'
import {StatusBadge} from '@/components/referenda'
import {phaseOf} from '@/lib/referendum'
import {chainDbHead, chainHeads, chainProps} from '@/lib/chain'
import {fmtBalance, fmtCompact, fmtCompact3, fmtInt, planckToNum, trackLabel} from '@/lib/format'
import {homeData, type BaselineRow, type DailyRow, type HourlyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

// both lists hold five slots so the pair stays level however little data lands
const ROW_H = 'h-[66px]'
const LIST_H = 'min-h-[332px]'

function StatusRow({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex items-center justify-between py-[9px] text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="font-mono">{children}</dd>
        </div>
    )
}

function InfoCell({label, children}: {label: string; children: React.ReactNode}) {
    return (
        <div className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
            <dt className="text-muted-foreground">{label}</dt>
            <dd className="min-w-0 truncate font-mono">{children}</dd>
        </div>
    )
}

function Bar({ratio}: {ratio: number}) {
    return <Progress value={Math.min(100, ratio * 100)} className="mt-1.5 h-1.5" />
}

export default async function Home() {
    const [props, heads, head] = await Promise.all([chainProps(), chainHeads(), chainDbHead()])
    // windows run back from the last indexed block, so a lagging indexer still spans a real day
    const ago = (days: number) => new Date(Date.parse(head.timestamp) - days * 86400000).toISOString()
    const data = await homeData(ago(1), ago(30))
    const days = data.dailyStats
    const today: DailyRow | undefined = days[0]

    const blockTime = today && today.blocks > 1 ? (Date.parse(today.tsLast) - Date.parse(today.tsFirst)) / 1000 / (today.blocks - 1) : null

    const sessionIdx = data.sessionHead[0]?.lastActiveSession ?? 0
    const period = props.sessionLength
    const inSession = period > 0 ? ((heads.best - props.sessionOffset) % period) + 1 : 0

    const indexing = heads.best - head.height > 50

    const cards: BlockCard[] = data.minedObjects.map(o => ({
        height: o.block.height,
        hash: o.block.hash,
        timestamp: o.block.timestamp,
        finalized: o.block.finalized,
        extrinsicCount: o.block.extrinsicCount,
        eventCount: o.block.eventCount,
        workHash: o.block.workHash!,
        minerAddr: o.block.author ? ss58Encode(o.block.author.id, props.ss58) : null,
        minerAcc: o.block.author ?? null,
        protocol: o.protocol,
        vertices: o.vertices,
    }))
    const faces = data.topology[0]?.faces ?? ''
    const genesisHash = data.genesis[0].hash

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
        if (prev <= 0) return {text: '—', note, tone: 'idle'}
        const p = ((cur - prev) / prev) * 100
        if (Math.abs(p) < 0.05) return {text: '0%', note, tone: 'idle'}
        return {text: `${p > 0 ? '+' : ''}${p.toFixed(1)}%`, note, tone: p > 0 ? 'pos' : 'neg'}
    }
    const countChip = (n: number, note: string): StatChip => ({text: fmtCompact(n), note, tone: 'idle'})
    const num = (v: string) => planckToNum(v, props.decimals)
    const curDifficulty = data.blocks[0] ? Number(data.blocks[0].difficulty) : today ? Number(today.difficultyClose) : 0

    const base24 = data.base24[0]
    const base30 = data.base30[0]
    // no baseline means the window opens before the chain did, and zero stands in for no reading
    const at = (r: BaselineRow | undefined, get: (r: BaselineRow) => number) => (r ? get(r) : 0)
    const stockChips = (now: number, get: (r: BaselineRow) => number) => [chip(now - at(base24, get), '24h'), chip(now - at(base30, get), '30d')]
    const traAt = (r: HourlyRow | undefined) => (r ? num(r.issuanceTransferable) - num(r.issuanceInactive) : 0)
    const diffAt = (r: BaselineRow | undefined) => at(r, b => Number(b.difficulty))
    const issNow = today ? num(today.issuanceTotal) : 0
    const inactiveNow = today ? num(today.issuanceInactive) : 0
    const traNow = today ? num(today.issuanceTransferable) - inactiveNow : 0

    return (
        <div>
            <Refresh ms={10000} />

            <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
                <Card className="gap-2 py-4 [--card-spacing:--spacing(5)]">
                    <CardHeader>
                        <CardTitle className="text-[15px] leading-normal font-semibold">Daily transactions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <LinesChart
                            labels={txLabels}
                            dualAxis
                            height={208}
                            series={[
                                {name: `Volume (${props.symbol})`, values: volSeries},
                                {name: 'Count', values: cntSeries},
                            ]}
                        />
                    </CardContent>
                </Card>

                <Card size="flush" className="px-5 py-4">
                    <div className="flex items-center justify-between">
                        <h2 className="text-[15px] font-semibold">Network status</h2>
                        <span className="flex items-center gap-1.5 text-xs">
                            <StatusDot tone={indexing ? 'warn' : 'pos'} />
                            <span className={indexing ? 'text-warn' : 'text-good'}>{indexing ? 'Indexing' : 'Operational'}</span>
                        </span>
                    </div>
                    {indexing && (
                        <div className="mt-3">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>Catching up</span>
                                <span className="font-mono">
                                    {fmtInt(head.height)} / {fmtInt(heads.best)}
                                </span>
                            </div>
                            <Bar ratio={head.height / Math.max(1, heads.best)} />
                        </div>
                    )}
                    <dl className="mt-1 divide-y">
                        <StatusRow label="Best block">
                            <Link href={`/block/${heads.best}`} className="text-primary hover:underline">
                                {fmtInt(heads.best)}
                            </Link>
                        </StatusRow>
                        <StatusRow label="Finalized">{fmtInt(heads.finalized)}</StatusRow>
                        <StatusRow label="Avg block time">{blockTime ? `${blockTime.toFixed(1)}s` : '—'}</StatusRow>
                        <StatusRow label="Validators">{fmtInt(data.validators.totalCount)}</StatusRow>
                        <StatusRow label="Session">#{fmtInt(sessionIdx)}</StatusRow>
                    </dl>
                    {period > 0 && (
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    Block {fmtInt(inSession)} / {period}
                                </span>
                            </div>
                            <Bar ratio={inSession / period} />
                        </div>
                    )}
                </Card>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4 lg:grid-cols-5">
                <StatTile
                    label="Signed extrinsics" href="/charts/extrinsics-total"
                    value={fmtInt(today?.cumExtrinsicsSigned ?? '0')}
                    chips={[chip(data.ext24.totalCount, '24h'), chip(data.ext30.totalCount, '30d')]}
                />
                <StatTile
                    label="Transfers" href="/charts/transfers-total"
                    value={fmtInt(today?.cumTransfers ?? '0')}
                    chips={[chip(data.transfers24.totalCount, '24h'), chip(data.transfers30.totalCount, '30d')]}
                />
                <StatTile
                    label="EVM txs" href="/charts/evm-transactions"
                    value={fmtInt(data.evmTotal.totalCount)}
                    chips={[chip(data.evm24.totalCount, '24h'), chip(data.evm30.totalCount, '30d')]}
                />
                <StatTile
                    label="Accounts" href="/charts/accounts"
                    value={fmtInt(data.accounts.totalCount)}
                    chips={[chip(data.fresh24.totalCount, '24h'), chip(data.fresh30.totalCount, '30d')]}
                />
                <StatTile
                    label="Miners" href="/charts/miners"
                    value={fmtInt(data.miners24.totalCount)}
                    chips={[countChip(data.miners30.totalCount, '30d'), countChip(data.minersTotal.totalCount, 'total')]}
                />
                <StatTile
                    label="Total issuance" href="/charts/issuance"
                    value={fmtCompact3(today?.issuanceTotal ?? '0', props.decimals, props.symbol)}
                    chips={stockChips(issNow, r => num(r.issuanceTotal))}
                />
                <StatTile
                    label="Active issuance" href="/charts/active-issuance"
                    value={fmtCompact3(today ? BigInt(today.issuanceTotal) - BigInt(today.issuanceInactive) : 0n, props.decimals, props.symbol)}
                    chips={stockChips(issNow - inactiveNow, r => num(r.issuanceTotal) - num(r.issuanceInactive))}
                />
                <StatTile
                    label="Transferable issuance" href="/charts/transferable-issuance"
                    value={fmtCompact3(today ? BigInt(today.issuanceTransferable) - BigInt(today.issuanceInactive) : 0n, props.decimals, props.symbol)}
                    chips={[chip(traNow - traAt(data.tra24[0]), '24h'), chip(traNow - traAt(data.tra30[0]), '30d')]}
                />
                <StatTile
                    label="Treasury pot" href="/charts/treasury"
                    value={fmtCompact3(today?.treasuryPot ?? '0', props.decimals, props.symbol)}
                    chips={stockChips(today ? num(today.treasuryPot) : 0, r => num(r.treasuryPot))}
                />
                <StatTile
                    label="Difficulty" href="/charts/difficulty"
                    value={curDifficulty > 0 ? fmtCompact(curDifficulty) : '—'}
                    chips={[pctChip(curDifficulty, diffAt(base24), '24h'), pctChip(curDifficulty, diffAt(base30), '30d')]}
                />
            </div>

            <Section title="Latest blocks" more="/blocks">
                <BlocksRail cards={cards} faces={faces} />
            </Section>

            <div className="mt-7 grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
                <div className="min-w-0">
                    <div className="mb-3 flex items-baseline justify-between gap-4">
                        <h2 className="text-[17px] font-semibold whitespace-nowrap">Transfers</h2>
                        <Link href="/transfers" className="pr-2 text-sm whitespace-nowrap text-primary hover:underline">
                            View all <Jump />
                        </Link>
                    </div>
                    <Card size="flush" className={`divide-y ${LIST_H}`}>
                        {data.transfers.length === 0 && <div className="px-5 py-6 text-sm text-muted-foreground">No transfers yet.</div>}
                        {data.transfers.map(t => (
                            <div key={t.id} className="flex flex-col justify-center gap-1.5 px-5 py-3 sm:h-[66px] sm:flex-row sm:items-center sm:gap-3 sm:py-0">
                                <div className="flex min-w-0 items-baseline justify-between gap-3 sm:block sm:w-[230px] sm:shrink-0">
                                    <span className="shrink-0">
                                        {t.extrinsic ? <ExtrinsicLink id={t.extrinsic.id} hash={t.extrinsic.hash} /> : <span className="font-mono text-muted-foreground">—</span>}
                                    </span>
                                    <div className="text-[11px] whitespace-nowrap text-muted-foreground sm:mt-0.5">
                                        <TimeCell iso={t.timestamp} cycle />
                                    </div>
                                </div>
                                <div className="min-w-0 flex-1 text-[12.5px]">
                                    <div className="flex min-w-0 items-baseline gap-2">
                                        <span className="w-9 shrink-0 text-[11px] text-dim">From</span>
                                        <AccountLink addr={ss58Encode(t.from.id, props.ss58)} acc={t.from} className="min-w-0" />
                                    </div>
                                    <div className="mt-0.5 flex min-w-0 items-baseline gap-2">
                                        <span className="w-9 shrink-0 text-[11px] text-dim">To</span>
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
                    </Card>
                </div>
                <div className="min-w-0">
                    <div className="mb-3 flex items-baseline justify-between gap-4">
                        <h2 className="text-[17px] font-semibold whitespace-nowrap">Referenda</h2>
                        <Link href="/governance" className="pr-2 text-sm whitespace-nowrap text-primary hover:underline">
                            View all <Jump />
                        </Link>
                    </div>
                    <Card size="flush" className={`divide-y ${LIST_H}`}>
                        {data.referendums.length === 0 && <div className="px-5 py-6 text-sm text-muted-foreground">No referenda yet.</div>}
                        {data.referendums.map(r => (
                            <div key={r.id} className={`${ROW_H} flex items-center gap-3 px-5`}>
                                <div className="min-w-0 flex-1">
                                    <div className="flex min-w-0 items-baseline gap-2">
                                        <Link href={`/referendum/${r.index}`} className="shrink-0 font-mono text-primary hover:underline">
                                            #{r.index}
                                        </Link>
                                        <span className="truncate text-[13px]">
                                            {r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 flex min-w-0 items-baseline gap-1.5 text-[11px] text-muted-foreground">
                                        <span className="truncate">{trackLabel(r.track.name)}</span>
                                        <span className="text-dim">·</span>
                                        <TimeAgo iso={r.submittedTimestamp} />
                                    </div>
                                </div>
                                <div className="shrink-0 text-right">
                                    <div className="font-mono text-sm">
                                        {r.proposalAmount != null ? (
                                            fmtBalance(r.proposalAmount, props.decimals, props.symbol)
                                        ) : (
                                            <span className="text-muted-foreground">{r.proposalMethod ?? '—'}</span>
                                        )}
                                    </div>
                                    <div className="mt-1 flex justify-end">
                                        <StatusBadge phase={phaseOf(r)} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </Card>
                </div>
            </div>

            <Section title="Network info">
                <Card size="flush" className="py-2">
                    <dl className="grid gap-x-10 px-5 py-1 sm:grid-cols-2 lg:grid-cols-3">
                        <InfoCell label="Chain">{props.chain}</InfoCell>
                        <InfoCell label="Token">{props.symbol}</InfoCell>
                        <InfoCell label="Decimals">{props.decimals}</InfoCell>
                        <InfoCell label="SS58 prefix">{props.ss58}</InfoCell>
                        <InfoCell label="Existential deposit">{fmtBalance(props.existentialDeposit, props.decimals, props.symbol)}</InfoCell>
                        <InfoCell label="Target block time">{props.blockTime}s</InfoCell>
                        <InfoCell label="Session length">{fmtInt(props.sessionLength)} blocks</InfoCell>
                        <InfoCell label="Spec version">{data.blocks[0]?.specVersion ?? '—'}</InfoCell>
                        <InfoCell label="PoScan protocol">{data.topology[0]?.id ?? '—'}</InfoCell>
                        <InfoCell label="EVM chain id">{props.evmChainId}</InfoCell>
                    </dl>
                    <div className="mt-1 border-t pt-1">
                        <DetailRow label="Native ERC20">
                            <AddressText addr={props.nativeErc20} full />
                            <CopyBtn text={props.nativeErc20} />
                        </DetailRow>
                        <DetailRow label="Genesis hash">
                            {genesisHash}
                            <CopyBtn text={genesisHash} />
                        </DetailRow>
                    </div>
                </Card>
            </Section>
        </div>
    )
}
