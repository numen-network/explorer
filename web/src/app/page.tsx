import Link from 'next/link'
import AddressText from '@/components/AddressText'
import BlocksRail, {type BlockCard} from '@/components/BlocksRail'
import CopyBtn from '@/components/CopyBtn'
import DotRow from '@/components/DotRow'
import EmptyList from '@/components/EmptyList'
import {DetailRow} from '@/components/Detail'
import Refresh from '@/components/Refresh'
import Section from '@/components/Section'
import StatTile, {type StatChip} from '@/components/StatTile'
import {TimeCell} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
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
import {fmtApprox, fmtBalance, fmtCompact, fmtCount, fmtInt, fmtMove, fmtPct, planckToNum, signOf, trackLabel, truncFixed} from '@/lib/format'
import {homeData, type BaselineRow, type DailyRow, type HourlyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

// both lists hold five slots so the pair stays level however little data lands
const ROW_H = 'sm:h-[66px]'
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
    // windows run back from the last indexed block, so a lagging indexer still spans a real day.
    // genesis has no timestamp to run back from, and a window with a null start matches no row
    const ago = (days: number) => (head.timestamp == null ? null : new Date(Date.parse(head.timestamp) - days * 86400000).toISOString())
    const data = await homeData(ago(1), ago(30))
    const days = data.dailyStats
    const today: DailyRow | undefined = days[0]

    const blockTime = today && today.blocks > 1 ? (Date.parse(today.tsLast) - Date.parse(today.tsFirst)) / ((today.blocks - 1) * 1000) : null

    const sessionIdx = data.sessionHead[0]?.lastActiveSession
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
        faces: o.topology.faces,
    }))
    const genesisHash = data.genesis[0].hash

    const chrono = [...days].reverse().slice(-30)
    const txLabels = chrono.map(d => d.id.slice(5))
    const volSeries = chrono.map(d => planckToNum(d.transferVolume, props.decimals))
    const cntSeries = chrono.map(d => d.transfers)
    const volTips = chrono.map(d => fmtApprox(d.transferVolume, props.decimals))


    const toneOf = (v: bigint): StatChip['tone'] => (v > 0n ? 'pos' : v < 0n ? 'neg' : 'idle')
    const chip = (n: number, note: string): StatChip => ({text: `${signOf(n)}${fmtCompact(Math.abs(n))}`, note, tone: toneOf(BigInt(n))})
    const amountChip = (planck: bigint, note: string): StatChip => ({text: fmtMove(planck, props.decimals), note, tone: toneOf(planck)})
    const pctChip = (cur: bigint, prev: bigint, note: string): StatChip => {
        const move = prev > 0n ? cur - prev : 0n
        return {text: `${signOf(move)}${fmtPct(move < 0n ? -move : move, prev)}`, note, tone: move > 0n ? 'pos' : move < 0n ? 'neg' : 'idle'}
    }
    const countChip = (n: number, note: string): StatChip => ({text: fmtCompact(n), note, tone: 'idle'})
    const curDifficulty = data.blocks[0] ? BigInt(data.blocks[0].difficulty) : today ? BigInt(today.difficultyClose) : 0n

    const base24 = data.base24[0]
    const base30 = data.base30[0]
    // no baseline means the window opens before the chain did, and zero stands in for no reading
    const at = (r: BaselineRow | undefined, get: (r: BaselineRow) => bigint) => (r ? get(r) : 0n)
    const stockChips = (now: bigint, get: (r: BaselineRow) => bigint) => [amountChip(now - at(base24, get), '24h'), amountChip(now - at(base30, get), '30d')]
    const traAt = (r: HourlyRow | undefined) => (r ? BigInt(r.issuanceTransferable) - BigInt(r.issuanceInactive) : 0n)
    const diffAt = (r: BaselineRow | undefined) => (r ? BigInt(r.difficulty) : 0n)
    const issNow = BigInt(today?.issuanceTotal ?? 0)
    const inactiveNow = BigInt(today?.issuanceInactive ?? 0)
    const traNow = today ? BigInt(today.issuanceTransferable) - inactiveNow : 0n

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
                                {name: `Volume (${props.symbol})`, values: volSeries, tips: volTips},
                                {name: 'Count', values: cntSeries, tips: cntSeries.map(n => fmtInt(n))},
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
                        <StatusRow label="Avg block time">{blockTime ? `${truncFixed(blockTime, 1)}s` : '—'}</StatusRow>
                        <StatusRow label="Validators">{fmtInt(data.validators.totalCount)}</StatusRow>
                        <StatusRow label="Session">{sessionIdx != null ? `#${fmtInt(sessionIdx)}` : '—'}</StatusRow>
                    </dl>
                    {period > 0 && (
                        <div>
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>
                                    Block {fmtInt(inSession)} / {fmtInt(period)}
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
                    value={fmtApprox(today?.issuanceTotal ?? '0', props.decimals, props.symbol)}
                    chips={stockChips(issNow, r => BigInt(r.issuanceTotal))}
                />
                <StatTile
                    label="Active issuance" href="/charts/active-issuance"
                    value={fmtApprox(today ? BigInt(today.issuanceTotal) - BigInt(today.issuanceInactive) : 0n, props.decimals, props.symbol)}
                    chips={stockChips(issNow - inactiveNow, r => BigInt(r.issuanceTotal) - BigInt(r.issuanceInactive))}
                />
                <StatTile
                    label="Transferable issuance" href="/charts/transferable-issuance"
                    value={fmtApprox(today ? BigInt(today.issuanceTransferable) - BigInt(today.issuanceInactive) : 0n, props.decimals, props.symbol)}
                    chips={[amountChip(traNow - traAt(data.tra24[0]), '24h'), amountChip(traNow - traAt(data.tra30[0]), '30d')]}
                />
                <StatTile
                    label="Treasury pot" href="/charts/treasury"
                    value={fmtApprox(today?.treasuryPot ?? '0', props.decimals, props.symbol)}
                    chips={stockChips(BigInt(today?.treasuryPot ?? 0), r => BigInt(r.treasuryPot))}
                />
                <StatTile
                    label="Difficulty" href="/charts/difficulty"
                    value={curDifficulty > 0n ? fmtCompact(curDifficulty) : '—'}
                    chips={[pctChip(curDifficulty, diffAt(base24), '24h'), pctChip(curDifficulty, diffAt(base30), '30d')]}
                />
            </div>

            <Section title="Latest blocks" more="/blocks">
                <BlocksRail cards={cards} />
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
                        {data.transfers.length === 0 && <EmptyList what="transfers" />}
                        {data.transfers.map(t => (
                            <div key={t.id} className={`flex flex-col justify-center gap-1.5 px-5 py-3 ${ROW_H} sm:flex-row sm:items-center sm:gap-3 sm:py-0`}>
                                <div className="sm:w-[230px] sm:shrink-0">
                                    {t.extrinsic ? <ExtrinsicLink id={t.extrinsic.id} /> : <span className="font-mono text-muted-foreground">—</span>}
                                    <div className="mt-0.5 text-[11px] text-muted-foreground sm:whitespace-nowrap">
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
                                    <div className="font-mono text-sm whitespace-nowrap">{fmtApprox(t.amount, props.decimals, props.symbol)}</div>
                                    <div className="flex min-w-0 justify-end sm:mt-1">
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
                        {data.referendums.length === 0 && <EmptyList what="referenda" />}
                        {data.referendums.map(r => {
                            const title = r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`
                            // phones stack the title, the facts, then the amount beside the status,
                            // wider rows give the amount the title's line and the status the facts' line
                            return (
                                <div key={r.id} className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3 ${ROW_H} sm:flex-col sm:flex-nowrap sm:items-stretch sm:justify-center sm:gap-1 sm:py-0`}>
                                    <div className="contents sm:flex sm:items-baseline sm:gap-3">
                                        <div className="flex min-w-0 basis-full items-baseline gap-2 sm:grow sm:basis-0">
                                            <Link href={`/referendum/${r.index}`} className="shrink-0 font-mono text-primary hover:underline">
                                                #{r.index}
                                            </Link>
                                            <Tip text={title}>
                                                <span className="truncate text-[13px]">{title}</span>
                                            </Tip>
                                        </div>
                                        <div className="order-1 font-mono text-sm whitespace-nowrap">
                                            {r.proposalAmount != null ? (
                                                `${fmtInt(truncFixed(r.proposalAmount, 0, props.decimals))} ${props.symbol}`
                                            ) : (
                                                <span className="text-muted-foreground">{r.proposalMethod ?? '—'}</span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="contents sm:flex sm:items-center sm:gap-3">
                                        <DotRow className="min-w-0 basis-full gap-y-0 text-[11px] text-muted-foreground sm:grow sm:basis-0">
                                            <span className="whitespace-nowrap">{trackLabel(r.track.name)}</span>
                                            <TimeCell iso={r.submittedTimestamp} cycle />
                                        </DotRow>
                                        <StatusBadge phase={phaseOf(r)} className="order-1 ml-auto" />
                                    </div>
                                </div>
                            )
                        })}
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
                        <InfoCell label="Session length">{fmtCount(props.sessionLength, 'block')}</InfoCell>
                        <InfoCell label="Spec version">{data.blocks[0]?.specVersion ?? '—'}</InfoCell>
                        <InfoCell label="PoScan protocol">{data.minedObjects[0]?.protocol ?? '—'}</InfoCell>
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
