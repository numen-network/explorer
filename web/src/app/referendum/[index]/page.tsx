import {Fragment, type ReactNode} from 'react'
import {Vote, type LucideIcon} from 'lucide-react'
import {SiDiscord} from '@icons-pack/react-simple-icons'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import EditedHistory from '@/components/EditedHistory'
import Foldable from '@/components/Foldable'
import Markdown from '@/components/Markdown'
import {DetailCard, DetailRow} from '@/components/Detail'
import Pager from '@/components/Pager'
import {TabNav, panelTabs} from '@/components/Tabs'
import {Tip} from '@/components/Tip'
import {CurvesChart, type TallyStep, type VoteStep} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import Approx from '@/components/Approx'
import {BlockLink, ReferendumLink} from '@/components/links'
import {CallTree} from '@/components/CallTree'
import {Gauge, ReferendumByline} from '@/components/referenda'
import {RequestCard, requestAccounts} from '@/components/RequestCard'
import {CROSS, RING, StepLinks, TICK, TimelineItem, TimelineList, TimelineRows, rawSteps} from '@/components/timeline'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {Separator} from '@/components/ui/separator'
import {withProposalViews} from '@/lib/args'
import {chainDbHead, chainProps, type ChainProps} from '@/lib/chain'
import {CONFIG} from '@/lib/config'
import {discussionOf} from '@/lib/discussions'
import {curveVoters} from '@/lib/curveVoters'
import {curveAt, type Curve} from '@/lib/curves'
import {approxParts, camelLabel, fmtBalance, fmtInt, fmtPct, fmtSpan, pctToNum, trackLabel, type Share} from '@/lib/format'
import {approvalOf, confirmEstimate, isLive, originName, phaseFraction, phaseOf, tallyTargets} from '@/lib/referendum'
import {blocksConstant} from '@/lib/runtime'
import {accountRefs, bountiesByIndex, eventsByIds, indexTitles, referendumDetail, specVersionAt, tallySnapshots, type ReferendumDepositRow, type TimelineEventRow} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {markArgs} from '@/lib/argMarks'
import {ss58Encode} from '@/lib/ss58'
import {voteHref, WALLET_URL} from '@/lib/wallet'
import {actionsPanel, votersOnCurves} from './actions'
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
    'Scheduler.Dispatched': 'Executed',
    'Scheduler.CallUnavailable': 'Call unavailable',
    'Scheduler.PermanentlyOverweight': 'Permanently overweight',
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
    'Scheduler.CallUnavailable': 'neg',
    'Scheduler.PermanentlyOverweight': 'neg',
}

const STEP_ICON = (name: string) => (name === 'Referenda.Confirmed' || name === 'Scheduler.Dispatched' ? TICK : /Rejected|Killed|Cancelled|TimedOut|Slashed|CallUnavailable|Overweight/.test(name) ? CROSS : RING)

// a pallet error wraps after the pallet rather than inside a word
function ErrorName({name}: {name: string}) {
    return <span className="font-mono">{name.split('.').map((part, i) => (i > 0 ? <Fragment key={i}>.<wbr />{part}</Fragment> : part))}</span>
}

function Mark({icon: Icon, className}: {icon: LucideIcon; className: string}) {
    return <Icon className={`size-3.5 shrink-0 ${className}`} strokeWidth={2.2} />
}

// what a phase's line says, where it ended, how long it has left, or
// before it starts, when it is expected to start
type PhaseTime = {kind: 'ended'; block: number} | {kind: 'left' | 'expected'; block: number; secs: number} | {kind: 'fail'}

function PhaseTimeText({time}: {time: PhaseTime}) {
    switch (time.kind) {
        case 'fail':
            return <span className="text-dim">Expected to fail</span>
        case 'ended':
            return (
                <>
                    Ended <span className="text-dim">·</span> <BlockLink height={time.block} />
                </>
            )
        case 'left':
        case 'expected':
            return (
                <>
                    {time.kind === 'left' ? `${fmtSpan(time.secs)} remaining` : `Est. start in ${fmtSpan(time.secs)}`} <span className="text-dim">·</span>{' '}
                    <BlockLink height={time.block} />
                </>
            )
    }
}

// a decision run past its period by a confirmation draws the period as a mark
interface PhaseMark {
    at: number
    tip: string
}

function PhaseBar({label, span, at, time, mark}: {label: string; span: string; at: number | null; time: PhaseTime | null; mark?: PhaseMark | null}) {
    const bar = (
        <div className="relative">
            <Progress value={at !== null ? Math.min(100, Math.max(0, at * 100)) : 0} className="h-2 bg-background" />
            {mark && <span className="absolute -top-[3px] h-3.5 w-px bg-foreground" style={{left: `${mark.at * 100}%`}} />}
        </div>
    )
    return (
        <div>
            {mark ? <Tip text={mark.tip}>{bar}</Tip> : bar}
            <div className="relative mt-1.5 flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">{label}</span>
                {mark ? (
                    <span className="absolute -translate-x-1/2 font-mono" style={{left: `${mark.at * 100}%`}}>
                        {span}
                    </span>
                ) : (
                    <span className="font-mono">{span}</span>
                )}
            </div>
            {time && (
                <div data-slot="phase-time" className="mt-0.5 text-right font-mono text-xs text-muted-foreground">
                    <PhaseTimeText time={time} />
                </div>
            )}
        </div>
    )
}

// a tally figure and, while the referendum is live, the amount it has to
// reach. each part ends in a separator and the row runs one separator past
// the box, so the last one on a line is always cut off
function Toward({target, chain, children}: {target: bigint | null; chain: ChainProps; children: ReactNode}) {
    if (target === null) return <span className="font-mono">{children}</span>
    return (
        <span className="min-w-0 overflow-hidden font-mono">
            <span className="-mr-[1.1em] flex flex-row-reverse flex-wrap-reverse *:whitespace-nowrap *:after:inline-block *:after:w-[1.1em] *:after:text-center *:after:text-muted-foreground *:after:content-['/']">
                <span className="order-2">{children}</span>
                <span className="order-1 text-muted-foreground">Need &gt;{approxParts(target, chain.decimals).figure}</span>
            </span>
        </span>
    )
}

function Slot({value, label, className = ''}: {value: string; label: string; className?: string}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <div className="font-mono">{value}</div>
            <div className="text-dim">{label}</div>
        </div>
    )
}

function HeldDeposit({d, chain}: {d: ReferendumDepositRow | undefined; chain: ChainProps}) {
    if (d == null) return '—'
    return (
        <>
            {fmtBalance(d.amount, chain.decimals, chain.symbol)}
            {d.who && (
                <>
                    {' '}
                    <span className="text-dim">·</span> <AccountLink addr={ss58Encode(d.who.id, chain.ss58)} acc={d.who} />
                </>
            )}
        </>
    )
}

export default async function ReferendumPage(props: PageProps<'/referendum/[index]'>) {
    const {index: rawIndex} = await props.params
    const sp = await props.searchParams
    const tab = String(sp.tab ?? '')
    if (!/^\d+$/.test(rawIndex)) notFound()
    const pg = paging(sp)
    const [chain, head, data, snapshots, thread] = await Promise.all([
        chainProps(),
        chainDbHead(),
        referendumDetail(Number(rawIndex), {limit: pg.size, offset: pg.offset}),
        tallySnapshots(Number(rawIndex)),
        discussionOf(Number(rawIndex)),
    ])
    const r = data.referendums[0]
    if (!r) notFound()

    const trail = rawSteps(r.timeline)
    const nodes = r.proposalCalls ?? []
    const submission = r.deposits.find(d => d.kind === 'Submission')
    const held = (kind: ReferendumDepositRow['kind']) => r.deposits.find(d => d.kind === kind && d.state === 'Held')
    const partyIds = [...new Set(requestAccounts(nodes))]
    const bountyIds = nodes.flatMap(node => (node.bounty != null ? [node.bounty] : []))
    const enactors = [...new Set(trail.flatMap(s => (s.byReferendum != null ? [s.byReferendum] : [])))]
    const latest = data.dailyStats[0]
    const activePlanck = latest ? BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive) : 0n
    const counts = {aye: data.ayeCount.totalCount, nay: data.nayCount.totalCount, abstain: data.abstainCount.totalCount, split: data.splitCount.totalCount}
    const [refs, evs, textEvs, votes, actions, actionRows, stats, spec, bounties, titles] = await Promise.all([
        accountRefs(partyIds),
        eventsByIds(trail.map(s => s.event)),
        eventsByIds(data.metadataActions.map(a => a.id)),
        tab === 'votes' ? votesPanel({r, counts, snapshots, live: activePlanck, sp, pg, chain}) : null,
        tab === 'curves' ? actionsPanel({index: r.index, sp, pg, chain}) : null,
        tab === 'curves' ? votersOnCurves(r.index, chain.ss58) : [],
        tab === 'statistics' ? statsPanel({index: r.index, chain}) : null,
        specVersionAt(r.submittedAt),
        bountyIds.length > 0 ? bountiesByIndex(bountyIds) : {bounties: []},
        enactors.length > 0 ? indexTitles({referenda: enactors, bounties: [], spends: [], registrars: []}) : {referendums: []},
    ])
    const callRows = withProposalViews(nodes, spec)
    await markArgs(callRows.map(c => c.view))
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
    // only a readable set on top is the text the card shows
    const versions = data.revisions.filter(a => a.method === 'MetadataSet' && (a.title !== null || a.description !== null))
    const edited = versions.length > 1 && versions[0] === data.revisions[0]
    const evWhos = evs.events.flatMap(e => [(e.args as {who?: unknown} | null)?.who, e.call?.origin?.id]).filter((w): w is string => typeof w === 'string')
    const titleOf = new Map(titles.referendums.map(t => [t.index, t.title]))
    const party = new Map(refs.accounts.map(a => [a.id, a]))

    const whoRefsRes = await accountRefs([...new Set(evWhos)])
    const whoRefs = new Map(whoRefsRes.accounts.map(a => [a.id, a]))

    const approvalNow = approvalOf(r)
    const supportNow: Share = [BigInt(r.support), activePlanck]

    const decisionHours = (r.track.decisionPeriod * chain.blockTime) / 3600
    const clockAt = r.endedAt ?? head.height
    const decisionAt = phaseFraction(r.decidingSince, r.track.decisionPeriod, clockAt)
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
    const currentVotes: VoteStep[] = [[lead.from, 0n, 0n]]
    for (const s of snapshots) {
        currentApproval.push([toX(s.block), approvalOf(s)])
        currentSupport.push([toX(s.block), [BigInt(s.support), BigInt(s.totalIssuance) - BigInt(s.inactiveIssuance)]])
        currentVotes.push([toX(s.block), BigInt(s.ayes), BigInt(s.nays)])
    }
    if (now) {
        currentApproval.push([now.at, approvalNow])
        currentSupport.push([now.at, supportNow])
        currentVotes.push([now.at, BigInt(r.ayes), BigInt(r.nays)])
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
    const prepareAt = phaseFraction(r.submittedAt, r.track.preparePeriod, clockAt)
    const confirmAt = phaseFraction(r.confirmingSince, r.track.confirmPeriod, clockAt)

    // a phase ends at the step that closed it, or once its due block is indexed
    const phaseEnd = (due: number | null, closed: number | null): PhaseTime | null => {
        if (closed !== null) return {kind: 'ended', block: closed}
        if (due === null) return null
        return head.height < due ? {kind: 'left', block: due, secs: (due - head.height) * chain.blockTime} : {kind: 'ended', block: due}
    }
    const expected = (block: number | null): PhaseTime => (block === null ? {kind: 'fail'} : {kind: 'expected', block, secs: (block - head.height) * chain.blockTime})
    const approvedAt = r.status === 'Approved' ? r.endedAt : null
    const confirmDue = r.confirmingSince !== null ? r.confirmingSince + r.track.confirmPeriod : null
    const decisionDue = r.decidingSince !== null ? r.decidingSince + r.track.decisionPeriod : null
    // a confirmation keeps the decision open past its period until it ends
    const decisionClose = approvedAt ?? (phaseOf(r) === 'Confirming' ? confirmDue : null)
    const decisionEnd = decisionDue !== null ? Math.max(decisionDue, decisionClose ?? decisionDue) : null
    const decisionRun = decisionEnd !== null ? decisionEnd - r.decidingSince! : null
    const decisionMark =
        decisionRun !== null && decisionRun > r.track.decisionPeriod
            ? {
                  at: r.track.decisionPeriod / decisionRun,
                  tip: `${fmtSpan(r.track.decisionPeriod * chain.blockTime)} decision period ${head.height < decisionDue! ? 'ends' : 'ended'} at #${fmtInt(decisionDue!)}, max decision time is ${fmtSpan(decisionRun * chain.blockTime)}`,
              }
            : null
    const enactedAt = trail.find(s => s.name.startsWith('Scheduler.'))?.block ?? null
    const enactClose = enactedAt ?? r.enactsAt
    const enactAt = approvedAt !== null && enactClose !== null ? phaseFraction(approvedAt, enactClose - approvedAt, head.height) : null
    // a phase not yet started is only expected, a confirmation can still be
    // aborted and a tally can still turn
    const confirmStart = phaseOf(r) === 'Deciding' ? confirmEstimate({...r, decidingSince: r.decidingSince!}, activePlanck, head.height) : undefined
    const confirmTime = confirmStart === undefined ? phaseEnd(confirmDue, approvedAt) : expected(confirmStart)
    const enactTime =
        confirmStart !== undefined
            ? expected(confirmStart === null ? null : confirmStart + r.track.confirmPeriod)
            : phaseOf(r) === 'Confirming'
              ? expected(confirmDue)
              : phaseEnd(r.enactsAt, enactedAt)
    const approvalNeed = x !== null ? curveAt(r.track.minApproval as Curve, x / 100) * 100 : null
    const supportNeed = x !== null ? curveAt(r.track.minSupport as Curve, x / 100) * 100 : null
    const tallied = BigInt(r.ayes) + BigInt(r.nays)
    const targets = isLive(r) ? tallyTargets({...r, decidingSince: r.decidingSince!}, activePlanck, head.height) : null
    // only a referendum still waiting for its decision deposit runs out of time
    const timeoutAt = phaseOf(r) === 'WaitingForDeposit' ? r.submittedAt + blocksConstant(head.specVersion, 'Referenda.UndecidingTimeout') : null

    // enactment only starts once the referendum is approved, keep the card
    // up through that phase
    const request = (
        <RequestCard
            index={r.index}
            track={r.track.name}
            nodes={nodes}
            spends={data.spends}
            enacted={trail.some(s => s.name === 'Scheduler.Dispatched')}
            chain={chain}
            head={head.height}
            party={party}
            bounties={new Map(bounties.bounties.map(b => [b.index, b.value]))}
        />
    )

    const status = (!ended || r.status === 'Approved') && (
        <Card className="gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[15px] leading-normal font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <PhaseBar
                    label="Prepare"
                    span={fmtSpan(r.track.preparePeriod * chain.blockTime)}
                    at={prepareAt}
                    time={phaseEnd(r.submittedAt + r.track.preparePeriod, null)}
                />
                <PhaseBar
                    label="Decision"
                    span={fmtSpan(r.track.decisionPeriod * chain.blockTime)}
                    at={phaseFraction(r.decidingSince, decisionRun ?? r.track.decisionPeriod, clockAt)}
                    time={phaseEnd(decisionEnd, approvedAt)}
                    mark={decisionMark}
                />
                <PhaseBar
                    label="Confirmation"
                    span={fmtSpan(r.track.confirmPeriod * chain.blockTime)}
                    at={confirmAt}
                    time={confirmTime}
                />
                <PhaseBar
                    label="Enactment"
                    span={fmtSpan(r.track.minEnactmentPeriod * chain.blockTime)}
                    at={enactAt}
                    time={enactTime}
                />
                {timeoutAt !== null && (
                    <div className="flex items-baseline justify-between border-t pt-3 text-sm">
                        <span className="text-muted-foreground">Timeout</span>
                        <span className="font-mono">
                            in {fmtSpan((timeoutAt - head.height) * chain.blockTime)} <span className="text-dim">·</span> <BlockLink height={timeoutAt} />
                        </span>
                    </div>
                )}
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
                    <Link href={`/referendum/${r.index}?tab=votes&group=aye`} className="flex items-center gap-1.5 hover:underline">
                        <Mark icon={TICK} className="text-good" />
                        Aye <span className="text-dim">({fmtInt(data.ayeCount.totalCount)})</span>
                    </Link>
                    <Toward target={targets?.ayes ?? null} chain={chain}>
                        <Approx planck={r.ayes} decimals={chain.decimals} symbol={chain.symbol} />
                    </Toward>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <Link href={`/referendum/${r.index}?tab=votes&group=nay`} className="flex items-center gap-1.5 hover:underline">
                        <Mark icon={CROSS} className="text-destructive" />
                        Nay <span className="text-dim">({fmtInt(data.nayCount.totalCount)})</span>
                    </Link>
                    <Toward target={targets?.nays ?? null} chain={chain}>
                        <Approx planck={r.nays} decimals={chain.decimals} symbol={chain.symbol} />
                    </Toward>
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
                    <Toward target={targets?.support ?? null} chain={chain}>
                        <Approx planck={r.support} decimals={chain.decimals} symbol={chain.symbol} />
                    </Toward>
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

    const links = (
        <div className="flex gap-2">
            {r.status === 'Ongoing' && (
                <Button asChild size="lg" className="flex-1 hover:bg-primary-hover">
                    <a href={voteHref(WALLET_URL, r.index, chain.genesis)} target="_blank" rel="noopener noreferrer">
                        <Vote />
                        Vote
                    </a>
                </Button>
            )}
            <Button asChild variant="outline" size="lg" className="flex-1 bg-card">
                <a href={thread ?? CONFIG.socials.discord} target="_blank" rel="noopener">
                    <SiDiscord title="" />
                    Discuss
                </a>
            </Button>
        </div>
    )

    const voters = curveVoters(
        actionRows.filter(a => r.endedAt === null || a.row.block <= r.endedAt),
        snapshots,
        {approval: r.track.minApproval as Curve, support: r.track.minSupport as Curve, hours: decisionHours, started: r.decidingSince !== null, hourOf: toX}
    )

    const curves = (
        <div className="space-y-4">
            <Card size="flush" className="px-5 py-4">
                <CurvesChart
                    approval={r.track.minApproval as Curve}
                    support={r.track.minSupport as Curve}
                    currentApproval={currentApproval}
                    currentSupport={currentSupport}
                    currentVotes={currentVotes}
                    voters={voters}
                    unit={{decimals: chain.decimals, symbol: chain.symbol}}
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

    const call =
        nodes.length === 0 ? (
            <DetailCard>
                <DetailRow label="Call">
                    <span className="text-dim">Nothing here reads back as a call</span>
                </DetailRow>
            </DetailCard>
        ) : (
            <CallTree calls={callRows} chain={chain} />
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
            <DetailRow label="Enact">
                {r.enactment.__kind}: {fmtInt(r.enactment.value)}
                {r.enactsAt !== null && (
                    <>
                        {' '}
                        <span className="text-dim">·</span> <BlockLink height={r.enactsAt} />
                    </>
                )}
            </DetailRow>
            <DetailRow label="Submission deposit">
                <HeldDeposit d={held('Submission')} chain={chain} />
            </DetailRow>
            <DetailRow label="Decision deposit">
                <HeldDeposit d={held('Decision')} chain={chain} />
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
                    if (submission) rows.push(['Submission deposit', fmtBalance(submission.amount, chain.decimals, chain.symbol)])
                }
                if (s.name === 'Referenda.Cancelled' || s.name === 'Referenda.Killed') {
                    const origin = e.call?.origin?.id
                    rows.unshift([
                        'By',
                        s.byReferendum != null ? (
                            <ReferendumLink key="by" index={s.byReferendum} title={titleOf.get(s.byReferendum)} />
                        ) : (
                            <AccountLink key="by" addr={ss58Encode(origin!, chain.ss58)} acc={whoRefs.get(origin!)} />
                        ),
                    ])
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

    const tabs = panelTabs([
        {slug: 'call', label: 'Call', body: () => call},
        {slug: 'metadata', label: 'Metadata', body: () => metadata},
        {slug: 'text', label: 'Text history', count: data.metadataCount.totalCount, body: () => texts},
        {slug: 'timeline', label: 'Timeline', count: trail.length, body: () => timeline},
        {slug: 'votes', label: 'Votes', count: data.voteCount.totalCount, body: () => votes},
        {slug: 'curves', label: 'Curves', body: () => curves},
        {slug: 'statistics', label: 'Statistics', body: () => stats},
    ], tab, s => `/referendum/${r.index}?tab=${s}`)

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
                        <Foldable>
                            <Markdown text={r.description} />
                        </Foldable>
                    ) : (
                        <p className="py-4 text-center text-sm text-dim">No description provided.</p>
                    )}
                    {edited && <EditedHistory versions={versions} className="mt-4" />}
                </Card>

                <div className="space-y-4 lg:row-span-2">
                    {request}
                    {status}
                    {tally}
                    {links}
                </div>

                <div className="min-w-0 lg:mt-3">
                    <TabNav aria-label="Referendum" items={tabs.items} />
                    <div className="mt-4">{tabs.active.body()}</div>
                </div>
            </div>
        </div>
    )
}
