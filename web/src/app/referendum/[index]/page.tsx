import {Fragment, type ReactNode} from 'react'
import type {LucideIcon} from 'lucide-react'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow, JsonBlock} from '@/components/Detail'
import Pager from '@/components/Pager'
import {TabPanels} from '@/components/Tabs'
import {CurvesChart, type TallyStep} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {BlockLink} from '@/components/links'
import {Gauge, ProposalTree, ReferendumByline} from '@/components/referenda'
import {CROSS, RING, StepLinks, TICK, TimelineItem, TimelineList, TimelineRows, rawSteps} from '@/components/timeline'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {Separator} from '@/components/ui/separator'
import {chainDbHead, chainProps} from '@/lib/chain'
import {curveAt, type Curve} from '@/lib/curves'
import {camelLabel, fmtBalance, fmtInt, fmtPct, fmtSpan, pctToNum, trackLabel, type Share} from '@/lib/format'
import {isLive, originName, phaseFraction, phaseOf} from '@/lib/referendum'
import {accountRefs, eventsByIds, referendumDetail, tallySnapshots, type TimelineEventRow} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {actionsPanel} from './actions'
import {statsPanel} from './stats'
import {votesPanel} from './votes'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/referendum/[index]'>) {
    const {index} = await props.params
    return {title: `Referendum #${index}`}
}

// the events a referendum raises on its way, read as steps on the rail
const STEP_LABEL: Record<string, string> = {
    'Referenda.Submitted': 'Submitted',
    'Referenda.DecisionDepositPlaced': 'Decision deposit placed',
    'Referenda.DecisionStarted': 'Deciding',
    'Referenda.ConfirmStarted': 'Confirming',
    'Referenda.ConfirmAborted': 'Confirm aborted',
    'Referenda.Confirmed': 'Confirmed',
    'Referenda.Rejected': 'Rejected',
    'Referenda.TimedOut': 'Timed out',
    'Referenda.Cancelled': 'Cancelled',
    'Referenda.Killed': 'Killed',
    'Referenda.DepositSlashed': 'Deposit slashed',
    'Referenda.SubmissionDepositRefunded': 'Submission deposit refunded',
    'Referenda.DecisionDepositRefunded': 'Decision deposit refunded',
    'Scheduler.Dispatched': 'Enacted',
}

// steps from one extrinsic follow this order, since place_decision_deposit
// raises DecisionStarted before DecisionDepositPlaced
const EXTRINSIC_ORDER = ['Referenda.Submitted', 'Referenda.DecisionDepositPlaced', 'Referenda.DecisionStarted', 'Referenda.ConfirmStarted']

const STEP_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'idle' | 'primary'> = {
    'Referenda.DecisionStarted': 'primary',
    'Referenda.ConfirmStarted': 'warn',
    'Referenda.Confirmed': 'pos',
    'Referenda.Rejected': 'neg',
    'Referenda.Killed': 'neg',
    'Referenda.DepositSlashed': 'neg',
    'Scheduler.Dispatched': 'pos',
}

const STEP_ICON = (name: string) => (name === 'Referenda.Confirmed' || name === 'Scheduler.Dispatched' ? TICK : /Rejected|Killed|Cancelled|TimedOut|Slashed/.test(name) ? CROSS : RING)

// a pallet error wraps after the pallet rather than inside a word
function ErrorName({name}: {name: string}) {
    return <span className="font-mono">{name.split('.').map((part, i) => (i > 0 ? <Fragment key={i}>.<wbr />{part}</Fragment> : part))}</span>
}

function Mark({icon: Icon, className}: {icon: LucideIcon; className: string}) {
    return <Icon className={`size-3.5 shrink-0 ${className}`} strokeWidth={2.2} />
}

function PhaseBar({label, span, at}: {label: string; span: string; at: number | null}) {
    return (
        <div>
            <Progress value={at !== null ? Math.min(100, Math.max(0, at * 100)) : 0} className="h-2 bg-background" />
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                <span className="font-mono">{span}</span>
            </div>
        </div>
    )
}

// approval as a fraction of the votes cast, none cast reading as none approving
function approvalOf(s: {ayes: string; nays: string}): [part: bigint, whole: bigint] {
    const ayes = BigInt(s.ayes)
    const cast = ayes + BigInt(s.nays)
    return cast > 0n ? [ayes, cast] : [0n, 1n]
}

function Slot({value, label, className = ''}: {value: string; label: string; className?: string}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <div className="font-mono">{value}</div>
            <div className="text-dim">{label}</div>
        </div>
    )
}

export default async function ReferendumPage(props: PageProps<'/referendum/[index]'>) {
    const {index: rawIndex} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    if (!/^\d+$/.test(rawIndex)) notFound()
    const pg = paging(sp)
    const [chain, head, data, snapshots] = await Promise.all([
        chainProps(),
        chainDbHead(),
        referendumDetail(Number(rawIndex), {limit: pg.size, offset: pg.offset}),
        tallySnapshots(Number(rawIndex)),
    ])
    const r = data.referendums[0]
    if (!r) notFound()

    const trail = rawSteps(r.timeline)
    const nodes = r.proposalCalls ?? []
    const payees = nodes.map(node => node.beneficiary)
    const partyIds = [...new Set([...payees, r.proposalBeneficiary, r.submissionDepositor, r.decisionDepositor].filter((id): id is string => id != null))]
    const counts = {aye: data.ayeCount.totalCount, nay: data.nayCount.totalCount, abstain: data.abstainCount.totalCount, split: data.splitCount.totalCount}
    const [refs, evs, textEvs, votes, actions, stats] = await Promise.all([
        accountRefs(partyIds),
        eventsByIds(trail.map(s => s.event)),
        eventsByIds(data.metadataActions.map(a => a.id)),
        tab === 'votes' ? votesPanel({index: r.index, counts, at: String(sp.group ?? ''), pg, chain}) : null,
        tab === 'curves' ? actionsPanel({index: r.index, sp, pg, chain}) : null,
        tab === 'statistics' ? statsPanel({index: r.index, chain}) : null,
    ])
    const stepOf = new Map(trail.map(s => [s.event, s]))
    const rank = (e: TimelineEventRow) => EXTRINSIC_ORDER.indexOf(stepOf.get(e.id)!.name)
    const runs: TimelineEventRow[][] = []
    for (const e of evs.events) {
        const run = runs.at(-1)
        if (run && e.extrinsic && run[0].extrinsic?.id === e.extrinsic.id) run.push(e)
        else runs.push([e])
    }
    const rail = runs.flatMap(run => run.sort((a, b) => rank(b) - rank(a)))
    const actionOf = new Map(data.metadataActions.map(a => [a.id, a]))
    const textRail = textEvs.events.map(e => ({a: actionOf.get(e.id)!, e}))
    const evWhos = evs.events.map(e => (e.args as {who?: unknown} | null)?.who).filter((w): w is string => typeof w === 'string')
    const party = new Map(refs.accounts.map(a => [a.id, a]))

    const whoRefsRes = await accountRefs([...new Set(evWhos)])
    const whoRefs = new Map(whoRefsRes.accounts.map(a => [a.id, a]))

    const latest = data.dailyStats[0]
    const activePlanck = latest ? BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive) : 0n
    const approvalNow = approvalOf(r)
    const supportNow: Share = [BigInt(r.support), activePlanck]

    const decisionHours = (r.track.decisionPeriod * chain.blockTime) / 3600
    const decisionAt = phaseFraction(r.decidingSince, r.track.decisionPeriod, head.height)
    const x = isLive(r) && decisionAt !== null ? Math.min(100, decisionAt * 100) : null

    // hour zero is where the decision clock started, or where it can start
    // soonest, or where a referendum that never got there ended. the lead-in
    // before it keeps its true length
    const clock = {
        zero: r.decidingSince ?? r.endedAt ?? Math.max(head.height, r.submittedAt + r.track.preparePeriod),
        perHour: 3600 / chain.blockTime,
        blockTime: chain.blockTime,
        started: r.decidingSince !== null,
    }
    const toX = (b: number) => Math.min(decisionHours, (b - clock.zero) / clock.perHour)
    const lead = {from: toX(r.submittedAt), submitted: r.submittedAt}
    const now = r.status === 'Ongoing' ? {at: toX(head.height)} : null

    // a tally starts empty at submission
    const currentApproval: TallyStep[] = [[lead.from, [0n, 1n]]]
    const currentSupport: TallyStep[] = [[lead.from, [0n, 1n]]]
    for (const s of snapshots) {
        currentApproval.push([toX(s.block), approvalOf(s)])
        currentSupport.push([toX(s.block), [BigInt(s.support), BigInt(s.totalIssuance) - BigInt(s.inactiveIssuance)]])
    }
    if (now) {
        currentApproval.push([now.at, approvalNow])
        currentSupport.push([now.at, supportNow])
    }
    // a kill, a cancellation or a rejection past the decision period cuts a
    // confirmation off with no abort event, an open one runs to the block the
    // pallet schedules it to pass at
    const confirmations: [number, number][] = []
    for (const [i, s] of trail.entries()) {
        if (s.name !== 'Referenda.ConfirmStarted') continue
        const close = trail.slice(i + 1).find(t => t.name === 'Referenda.ConfirmAborted' || t.name === 'Referenda.Confirmed')
        confirmations.push([toX(s.block), toX(close?.block ?? r.endedAt ?? s.block + r.track.confirmPeriod)])
    }
    // only a pass ends a referendum early, one still confirming passes where
    // its open window closes
    const end = r.status === 'Approved' ? toX(r.endedAt!) : phaseOf(r) === 'Confirming' ? confirmations.at(-1)?.[1] : undefined
    const earlyEnd = end !== undefined && end < decisionHours ? end : null

    const ended = r.endedAt !== null
    const prepareAt = phaseFraction(r.submittedAt, r.track.preparePeriod, head.height)
    const confirmAt = phaseFraction(r.confirmingSince, r.track.confirmPeriod, head.height)
    const enactAt = r.status === 'Approved' ? phaseFraction(r.endedAt, r.track.minEnactmentPeriod, head.height) : null
    const approvalNeed = x !== null ? curveAt(r.track.minApproval as Curve, x / 100) * 100 : null
    const supportNeed = x !== null ? curveAt(r.track.minSupport as Curve, x / 100) * 100 : null
    const tallied = BigInt(r.ayes) + BigInt(r.nays)

    // enactment only starts once the referendum is approved, keep the card
    // up through that phase
    const status = (!ended || r.status === 'Approved') && (
        <Card className="gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[15px] leading-normal font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <PhaseBar label="Prepare" span={fmtSpan(r.track.preparePeriod * chain.blockTime)} at={prepareAt} />
                <PhaseBar label="Decision" span={fmtSpan(r.track.decisionPeriod * chain.blockTime)} at={decisionAt} />
                <PhaseBar label="Confirmation" span={fmtSpan(r.track.confirmPeriod * chain.blockTime)} at={confirmAt} />
                <PhaseBar label="Enactment" span={fmtSpan(r.track.minEnactmentPeriod * chain.blockTime)} at={enactAt} />
                <div className="flex items-baseline justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Attempts</span>
                    <span className="font-mono">{fmtInt(trail.filter(s => s.name === 'Referenda.ConfirmStarted').length)}</span>
                </div>
            </CardContent>
        </Card>
    )

    const tally = (
        <Card className="gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[15px] leading-normal font-semibold">Tally</CardTitle>
            </CardHeader>
            <CardContent>
            <div>
                <Gauge value={tallied > 0n ? pctToNum(...approvalNow) : null} need={approvalNeed} variant="split" />
            </div>
            <div className="mt-1.5 flex text-[11px]">
                <Slot className="flex-1 text-left text-good" value={fmtPct(r.ayes, tallied)} label="Aye" />
                <Slot className="flex-1 text-center text-muted-foreground" value={approvalNeed !== null ? fmtPct(approvalNeed, 100) : '—'} label="Threshold" />
                <Slot className="flex-1 text-right text-destructive" value={fmtPct(r.nays, tallied)} label="Nay" />
            </div>

            <div className="mt-4 divide-y border-t text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark icon={TICK} className="text-good" />
                        Aye <span className="text-dim">({fmtInt(data.ayeCount.totalCount)})</span>
                    </span>
                    <span className="font-mono">
                        <Approx planck={r.ayes} decimals={chain.decimals} symbol={chain.symbol} />
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark icon={CROSS} className="text-destructive" />
                        Nay <span className="text-dim">({fmtInt(data.nayCount.totalCount)})</span>
                    </span>
                    <span className="font-mono">
                        <Approx planck={r.nays} decimals={chain.decimals} symbol={chain.symbol} />
                    </span>
                </div>
            </div>

            <div className="mt-4">
                <Gauge value={pctToNum(...supportNow)} need={supportNeed} variant="solid" />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
                <Slot className="text-support" value={fmtPct(r.support, activePlanck)} label="Support" />
                <Slot className="text-right text-muted-foreground" value={supportNeed !== null ? fmtPct(supportNeed, 100) : '—'} label="Threshold" />
            </div>

            <div className="mt-4 divide-y border-t text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-muted-foreground">Support</span>
                    <span className="font-mono">
                        <Approx planck={r.support} decimals={chain.decimals} symbol={chain.symbol} />
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-muted-foreground">Active issuance</span>
                    <span className="font-mono">
                        <Approx planck={activePlanck} decimals={chain.decimals} symbol={chain.symbol} />
                    </span>
                </div>
            </div>
            </CardContent>
        </Card>
    )

    const curves = (
        <div className="space-y-4">
            <Card size="flush" className="px-5 py-4">
                <CurvesChart
                    approval={r.track.minApproval as Curve}
                    support={r.track.minSupport as Curve}
                    currentApproval={currentApproval}
                    currentSupport={currentSupport}
                    now={now}
                    confirmations={confirmations}
                    earlyEnd={earlyEnd}
                    hours={decisionHours}
                    clock={clock}
                    lead={lead}
                />
            </Card>
            {actions}
        </div>
    )

    const spends = nodes.filter(node => node.amount != null)
    const call = (
        <DetailCard>
            {nodes.length === 0 ? (
                <DetailRow label="Call">
                    <span className="text-dim">Nothing here reads back as a call</span>
                </DetailRow>
            ) : (
                <>
                    <ProposalTree nodes={nodes} chain={chain} head={head.height} party={party} />
                    {spends.length > 1 && r.proposalAmount != null && (
                        <DetailRow label="Total">{fmtBalance(r.proposalAmount, chain.decimals, chain.symbol)}</DetailRow>
                    )}
                    <DetailRow label="Args">
                        <JsonBlock value={r.proposalArgs} />
                    </DetailRow>
                </>
            )}
        </DetailCard>
    )

    const metadata = (
        <DetailCard>
            <DetailRow label="Index">{r.index}</DetailRow>
            <DetailRow label="Track">
                {trackLabel(r.track.name)} <span className="text-muted-foreground">#{r.track.id}</span>
            </DetailRow>
            <DetailRow label="Origin">{originName(r.origin) ?? '—'}</DetailRow>
            <DetailRow label="Proposal hash">
                {r.proposalHash ? (
                    <>
                        <span className="font-mono">{r.proposalHash}</span>
                        <CopyBtn text={r.proposalHash} />
                    </>
                ) : (
                    '—'
                )}
            </DetailRow>
            <DetailRow label="Submitted at">
                <BlockLink height={r.submittedAt} />
            </DetailRow>
            <DetailRow label="Deciding since">{r.decidingSince !== null ? <BlockLink height={r.decidingSince} /> : '—'}</DetailRow>
            <DetailRow label="Confirming since">{r.confirmingSince !== null ? <BlockLink height={r.confirmingSince} /> : '—'}</DetailRow>
            <DetailRow label="Ended at">{r.endedAt !== null ? <BlockLink height={r.endedAt} /> : '—'}</DetailRow>
            <DetailRow label="Submission deposit">
                {r.submissionDeposit != null && r.submissionDepositor != null ? (
                    <>
                        {fmtBalance(r.submissionDeposit, chain.decimals, chain.symbol)} <span className="text-dim">·</span>{' '}
                        <AccountLink addr={ss58Encode(r.submissionDepositor, chain.ss58)} acc={party.get(r.submissionDepositor)} />
                    </>
                ) : (
                    '—'
                )}
            </DetailRow>
            <DetailRow label="Decision deposit">
                {r.decisionDeposit != null && r.decisionDepositor != null ? (
                    <>
                        {fmtBalance(r.decisionDeposit, chain.decimals, chain.symbol)} <span className="text-dim">·</span>{' '}
                        <AccountLink addr={ss58Encode(r.decisionDepositor, chain.ss58)} acc={party.get(r.decisionDepositor)} />
                    </>
                ) : (
                    '—'
                )}
            </DetailRow>
        </DetailCard>
    )

    // every text the referendum ever carried, newest first, since the pointer
    // may move while people are voting and the earlier pitch should stay readable
    const texts = (
        <>
            <TimelineList empty={textRail.length === 0}>
                {textRail.map(({a, e}) => (
                    <TimelineItem
                        key={a.id}
                        tone={a.method === 'MetadataSet' ? 'primary' : 'idle'}
                        icon={a.method === 'MetadataSet' ? RING : CROSS}
                        title={a.method === 'MetadataSet' ? 'Text set' : 'Text cleared'}
                        iso={a.timestamp}
                        links={<StepLinks block={a.block} event={e} />}
                        detail={
                            a.method === 'MetadataSet' ? (
                                <div className="min-w-0">
                                    {a.title ? (
                                        <p className="text-sm font-semibold wrap-anywhere">{a.title}</p>
                                    ) : (
                                        <p className="text-sm text-dim">Nothing read back from the preimage</p>
                                    )}
                                    {a.description && <p className="mt-1.5 text-sm whitespace-pre-wrap wrap-anywhere">{a.description}</p>}
                                    <p className="mt-2 flex items-center gap-1 text-xs text-dim">
                                        <span className="font-mono break-all">{a.hash}</span>
                                        <CopyBtn text={a.hash} />
                                    </p>
                                </div>
                            ) : undefined
                        }
                    />
                ))}
            </TimelineList>
            <Pager paging={pg} total={data.metadataCount.totalCount} href={`/referendum/${r.index}?tab=text`} />
        </>
    )

    // what the step's own event carried, zero tallies before anyone voted say
    // nothing worth a row
    const stepRows = (args: unknown, amountLabel: string): [string, ReactNode][] => {
        const a = (args ?? {}) as {who?: unknown; amount?: unknown; tally?: {ayes?: unknown; nays?: unknown; support?: unknown}}
        const rows: [string, ReactNode][] = []
        if (typeof a.who === 'string') rows.push(['Who', <AccountLink key="who" addr={ss58Encode(a.who, chain.ss58)} acc={whoRefs.get(a.who)} />])
        if (a.amount != null) rows.push([amountLabel, fmtBalance(String(a.amount), chain.decimals, chain.symbol)])
        const tally = [['Ayes', a.tally?.ayes], ['Nays', a.tally?.nays], ['Support', a.tally?.support]].filter(([, v]) => v != null)
        if (tally.some(([, v]) => String(v) !== '0')) {
            for (const [k, v] of tally) rows.push([String(k), fmtBalance(String(v), chain.decimals, chain.symbol)])
        }
        return rows
    }

    const timeline = (
        <TimelineList empty={rail.length === 0}>
            {rail.map(e => {
                const s = stepOf.get(e.id)!
                const error = s.error
                const failed = error != null
                const label = STEP_LABEL[s.name] ?? camelLabel(s.name.split('.')[1])
                const rows = stepRows(e.args, s.name === 'Referenda.DecisionDepositPlaced' ? 'Decision deposit' : 'Amount')
                // the Submitted event names neither party nor deposit, the
                // referendum record fills the step in
                if (s.name === 'Referenda.Submitted') {
                    if (r.submitter) rows.unshift(['Who', <AccountLink key="s" addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} />])
                    if (r.submissionDeposit != null) rows.push(['Submission deposit', fmtBalance(r.submissionDeposit, chain.decimals, chain.symbol)])
                }
                if (failed) rows.push(['Error', <ErrorName key="error" name={error} />])
                return (
                    <TimelineItem
                        key={e.id}
                        tone={failed ? 'neg' : (STEP_TONE[s.name] ?? 'idle')}
                        icon={failed ? CROSS : STEP_ICON(s.name)}
                        title={
                            failed ? (
                                <span className="flex flex-wrap items-center gap-x-2">
                                    {label}
                                    <Badge variant="neg">Failed</Badge>
                                </span>
                            ) : (
                                label
                            )
                        }
                        iso={s.timestamp}
                        links={<StepLinks block={s.block} event={e} />}
                        detail={rows.length > 0 ? <TimelineRows rows={rows} /> : undefined}
                    />
                )
            })}
        </TimelineList>
    )

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">Referendum #{r.index}</h1>

            {/* one flat grid, so a phone reads the card, then status and tally,
                then the tab panels. the 1fr row soaks up the side pair's
                overshoot so the span cannot inflate the card row */}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr]">
                <Card size="flush" className="min-w-0 px-7 py-5">
                    <p className="text-base font-semibold wrap-anywhere">{r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}</p>
                    <ReferendumByline r={r} chain={chain} className="mt-3" />
                    <Separator className="my-4" />
                    {r.description ? (
                        <p className="text-sm whitespace-pre-wrap wrap-anywhere">{r.description}</p>
                    ) : (
                        <p className="py-4 text-center text-sm text-dim">No description provided.</p>
                    )}
                </Card>

                <div className="space-y-4 lg:row-span-2">
                    {status}
                    {tally}
                </div>

                <TabPanels
                    className="min-w-0 lg:mt-3"
                    at={tab}
                    href={s => `/referendum/${r.index}?tab=${s}`}
                    panels={[
                        {slug: 'call', label: 'Call', body: () => call},
                        {slug: 'metadata', label: 'Metadata', body: () => metadata},
                        {slug: 'text', label: 'Text history', count: data.metadataCount.totalCount, body: () => texts},
                        {slug: 'timeline', label: 'Timeline', count: trail.length, body: () => timeline},
                        {slug: 'votes', label: 'Votes', count: data.voteCount.totalCount, body: () => votes},
                        {slug: 'curves', label: 'Curves', body: () => curves},
                        {slug: 'statistics', label: 'Statistics', body: () => stats},
                    ]}
                />
            </div>
        </div>
    )
}
