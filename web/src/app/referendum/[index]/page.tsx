import type {ReactNode} from 'react'
import type {LucideIcon} from 'lucide-react'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow, JsonBlock, NONE} from '@/components/Detail'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {CurvesChart} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import {BlockLink, ExtrinsicLink} from '@/components/links'
import {Gauge, ProposalTree, StatusBadge} from '@/components/referenda'
import {CROSS, RING, TICK, TimelineItem, TimelineList, TimelineRows, rawSteps} from '@/components/timeline'
import ActionList, {type ActionImpact, type ActionRow} from '@/components/actions'
import VoteLists, {type VoteEntry} from '@/components/votes'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {Separator} from '@/components/ui/separator'
import {chainHeads, chainProps} from '@/lib/chain'
import {capitalOf, convictionLabel, decisionOf, votesOf, weigh} from '@/lib/conviction'
import {curveAt, curveSamples, type Curve} from '@/lib/curves'
import {camelLabel, fmtBalance, fmtBlockSpan, fmtCompact, fmtInt, planckToNum, trackLabel} from '@/lib/format'
import {isLive, originName, phaseFraction, phaseOf} from '@/lib/referendum'
import {accountRefs, delegationActionsFor, delegationsFor, eventsByIds, referendumDetail} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

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
    'Referenda.Approved': 'Approved',
    'Referenda.Rejected': 'Rejected',
    'Referenda.TimedOut': 'Timed out',
    'Referenda.Cancelled': 'Cancelled',
    'Referenda.Killed': 'Killed',
    'Referenda.DepositSlashed': 'Deposit slashed',
    'Referenda.SubmissionDepositRefunded': 'Submission deposit refunded',
    'Referenda.DecisionDepositRefunded': 'Decision deposit refunded',
    'Scheduler.Dispatched': 'Enacted',
}

const STEP_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'idle' | 'primary'> = {
    'Referenda.DecisionStarted': 'primary',
    'Referenda.ConfirmStarted': 'warn',
    'Referenda.Confirmed': 'pos',
    'Referenda.Approved': 'pos',
    'Referenda.Rejected': 'neg',
    'Referenda.Killed': 'neg',
    'Referenda.DepositSlashed': 'neg',
    'Scheduler.Dispatched': 'pos',
}

const STEP_ICON = (name: string) => (name === 'Referenda.Approved' || name === 'Scheduler.Dispatched' ? TICK : /Rejected|Killed|Cancelled|TimedOut|Slashed/.test(name) ? CROSS : RING)

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

function Slot({value, label, className = ''}: {value: string; label: string; className?: string}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <div className="font-mono">{value}</div>
            <div className="text-dim">{label}</div>
        </div>
    )
}

// the panel answers who is behind the vote, the full roster lives on the
// delegate account page
const INLINE_DELEGATORS = 10

export default async function ReferendumPage(props: PageProps<'/referendum/[index]'>) {
    const {index: rawIndex} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    if (!/^\d+$/.test(rawIndex)) notFound()
    const [chain, heads, data] = await Promise.all([chainProps(), chainHeads(), referendumDetail(Number(rawIndex))])
    const r = data.referendums[0]
    if (!r) notFound()

    const trail = rawSteps(r.timeline)
    const voterIds = [...new Set(data.votes.map(v => v.voter?.id).filter((id): id is string => id != null))]
    const nodes = r.proposalCalls ?? []
    const payees = nodes.map(node => node.beneficiary)
    const partyIds = [...new Set([...payees, r.proposalBeneficiary, r.submissionDepositor, r.decisionDepositor].filter((id): id is string => id != null))]
    const [refs, dels, dacts, evs] = await Promise.all([
        accountRefs(partyIds),
        delegationsFor(voterIds, r.track.id),
        delegationActionsFor(r.track.id, r.submittedAt, r.endedAt),
        eventsByIds(trail.map(s => s.event)),
    ])
    const evBy = new Map(evs.events.map(e => [e.id, e]))
    const evWhos = evs.events.map(e => (e.args as {who?: unknown} | null)?.who).filter((w): w is string => typeof w === 'string')
    const party = new Map(refs.accounts.map(a => [a.id, a]))

    const byTarget = new Map<string, typeof dels.delegations>()
    for (const d of dels.delegations) byTarget.set(d.target.id, [...(byTarget.get(d.target.id) ?? []), d])
    const shown = [...new Set([...byTarget.values()].flatMap(list => list.slice(0, INLINE_DELEGATORS).map(d => d.who.id)))]

    // a delegation change only moves the tally while its target holds a
    // standard vote, the inert rest ride inside the target's next vote row
    const voteLog = new Map<string, typeof data.voteActions>()
    for (const a of [...data.voteActions].reverse()) voteLog.set(a.voter.id, [...(voteLog.get(a.voter.id) ?? []), a])
    const standingVoteAt = (target: string, block: number, id: string) => {
        let last
        for (const a of voteLog.get(target) ?? []) {
            if (a.block > block || (a.block === block && a.id >= id)) break
            last = a
        }
        return last?.method === 'Voted' && last.kind === 'Standard' ? last : undefined
    }
    const dactRows = dacts.delegationActions.flatMap(a => {
        const vote = standingVoteAt(a.target.id, a.block, a.id)
        return vote ? [{a, vote}] : []
    })

    const whoRefsRes = await accountRefs([...new Set([...shown, ...evWhos])])
    const whoRefs = new Map(whoRefsRes.accounts.map(a => [a.id, a]))

    const actions: ActionRow[] = [
        ...data.voteActions.map(a => ({
            id: a.id,
            block: a.block,
            iso: a.timestamp,
            actor: {addr: ss58Encode(a.voter.id, chain.ss58), acc: a.voter},
            amount: String(votesOf(a) + BigInt(a.delegatedVotes)),
            own: String(votesOf(a)),
            delegated: a.delegatedVotes,
            kind: (a.method === 'Voted' ? 'vote' : 'remove') as 'vote' | 'remove',
            decision: decisionOf(a),
        })),
        ...dactRows.map(({a, vote}) => ({
            id: a.id,
            block: a.block,
            iso: a.timestamp,
            actor: {addr: ss58Encode(a.target.id, chain.ss58), acc: a.target},
            amount: String(votesOf(vote) + BigInt(a.delegatedVotes)),
            own: String(votesOf(vote)),
            delegated: a.delegatedVotes,
            kind: (a.method === 'Delegated' ? 'delegate' : 'undelegate') as 'delegate' | 'undelegate',
            by: {addr: ss58Encode(a.who.id, chain.ss58), acc: a.who},
        })),
    ].sort((x, y) => y.block - x.block || y.id.localeCompare(x.id))

    const snapPct = (s: (typeof data.snapshots)[number]) => {
        const a = planckToNum(s.ayes, chain.decimals)
        const n = planckToNum(s.nays, chain.decimals)
        const act = planckToNum(BigInt(s.totalIssuance) - BigInt(s.inactiveIssuance), chain.decimals)
        return {
            approval: a + n > 0 ? (a / (a + n)) * 100 : 0,
            support: act > 0 ? (planckToNum(s.support, chain.decimals) / act) * 100 : 0,
        }
    }
    // tally snapshots record end of block state, so a block's whole move
    // lands on its latest action row
    const impactByBlock = new Map<number, ActionImpact>()
    let prevPct = {approval: 0, support: 0}
    for (const s of data.snapshots) {
        const p = snapPct(s)
        impactByBlock.set(s.block, {approval: p.approval - prevPct.approval, support: p.support - prevPct.support})
        prevPct = p
    }
    const seen = new Set<number>()
    for (const a of actions) {
        if (seen.has(a.block)) continue
        seen.add(a.block)
        a.impact = impactByBlock.get(a.block)
    }

    const latest = data.dailyStats[0]
    const activeIssuance = latest ? planckToNum(BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive), chain.decimals) : 0
    const ayes = planckToNum(r.ayes, chain.decimals)
    const nays = planckToNum(r.nays, chain.decimals)
    const supportVal = planckToNum(r.support, chain.decimals)
    const total = ayes + nays
    const approvalNow = total > 0 ? (ayes / total) * 100 : 0
    const supportNow = activeIssuance > 0 ? (supportVal / activeIssuance) * 100 : 0

    const decisionHours = Math.max(1, Math.round((r.track.decisionPeriod * chain.blockTime) / 3600))
    const deciding = r.decidingSince !== null && r.track.decisionPeriod > 0 ? {start: r.decidingSince, perHour: r.track.decisionPeriod / decisionHours} : null
    const approvalCurve = curveSamples(r.track.minApproval as Curve, decisionHours)
    const supportCurve = curveSamples(r.track.minSupport as Curve, decisionHours)
    const decisionAt = phaseFraction(r.decidingSince, r.track.decisionPeriod, heads.best)
    const x = isLive(r) && decisionAt !== null ? Math.min(100, decisionAt * 100) : null
    const now = x !== null ? {at: (x / 100) * decisionHours, approval: approvalNow, support: supportNow} : null

    const currentApproval: [number, number][] = []
    const currentSupport: [number, number][] = []
    const decidingStart = r.decidingSince
    if (decidingStart !== null && r.track.decisionPeriod > 0) {
        // votes cast before the decision clock started all collapse to hour
        // zero, only the last of them still holds there
        const pre = data.snapshots.filter(s => s.block <= decidingStart)
        const kept = [...pre.slice(-1), ...data.snapshots.filter(s => s.block > decidingStart)]
        const toX = (b: number) => Math.min(decisionHours, Math.max(0, ((b - decidingStart) / r.track.decisionPeriod) * decisionHours))
        for (const s of kept) {
            const p = snapPct(s)
            currentApproval.push([toX(s.block), p.approval])
            currentSupport.push([toX(s.block), p.support])
        }
    }
    if (now) {
        currentApproval.push([now.at, now.approval])
        currentSupport.push([now.at, now.support])
    }

    const ended = r.endedAt !== null
    const prepareAt = phaseFraction(r.submittedAt, r.track.preparePeriod, heads.best)
    const confirmAt = phaseFraction(r.confirmingSince, r.track.confirmPeriod, heads.best)
    const enactAt = r.status === 'Approved' ? phaseFraction(r.endedAt, r.track.minEnactmentPeriod, heads.best) : null
    const approvalNeed = x !== null ? curveAt(r.track.minApproval as Curve, x / 100) * 100 : null
    const supportNeed = x !== null ? curveAt(r.track.minSupport as Curve, x / 100) * 100 : null
    const pct = (n: number) => `${n.toFixed(n < 1 ? 2 : 1)}%`

    // enactment only starts once the referendum is approved, keep the card
    // up through that phase
    const status = (!ended || r.status === 'Approved') && (
        <Card className="gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[15px] leading-normal font-semibold">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <PhaseBar label="Prepare" span={fmtBlockSpan(r.track.preparePeriod, chain.blockTime)} at={prepareAt} />
                <PhaseBar label="Decision" span={fmtBlockSpan(r.track.decisionPeriod, chain.blockTime)} at={decisionAt} />
                <PhaseBar label="Confirmation" span={fmtBlockSpan(r.track.confirmPeriod, chain.blockTime)} at={confirmAt} />
                <PhaseBar label="Enactment" span={fmtBlockSpan(r.track.minEnactmentPeriod, chain.blockTime)} at={enactAt} />
                <div className="flex items-baseline justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Attempts</span>
                    <span className="font-mono">{trail.filter(s => s.name === 'Referenda.ConfirmStarted').length}</span>
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
                <Gauge value={total > 0 ? approvalNow : null} need={approvalNeed} variant="split" />
            </div>
            <div className="mt-1.5 flex text-[11px]">
                <Slot className="flex-1 text-left text-good" value={pct(approvalNow)} label="Aye" />
                <Slot className="flex-1 text-center text-muted-foreground" value={approvalNeed !== null ? pct(approvalNeed) : '—'} label="Threshold" />
                <Slot className="flex-1 text-right text-destructive" value={pct(total > 0 ? 100 - approvalNow : 0)} label="Nay" />
            </div>

            <div className="mt-4 divide-y border-t text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark icon={TICK} className="text-good" />
                        Aye <span className="text-dim">({fmtInt(data.ayeCount.totalCount)})</span>
                    </span>
                    <span className="font-mono">
                        {fmtCompact(ayes)} {chain.symbol}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark icon={CROSS} className="text-destructive" />
                        Nay <span className="text-dim">({fmtInt(data.nayCount.totalCount)})</span>
                    </span>
                    <span className="font-mono">
                        {fmtCompact(nays)} {chain.symbol}
                    </span>
                </div>
            </div>

            <div className="mt-4">
                <Gauge value={supportNow} need={supportNeed} variant="solid" />
            </div>
            <div className="mt-1.5 flex justify-between text-[11px]">
                <Slot className="text-support" value={pct(supportNow)} label="Support" />
                <Slot className="text-right text-muted-foreground" value={supportNeed !== null ? pct(supportNeed) : '—'} label="Threshold" />
            </div>

            <div className="mt-4 divide-y border-t text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-muted-foreground">Support</span>
                    <span className="font-mono">
                        {fmtCompact(supportVal)} {chain.symbol}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-muted-foreground">Active issuance</span>
                    <span className="font-mono">
                        {fmtCompact(activeIssuance)} {chain.symbol}
                    </span>
                </div>
            </div>
            </CardContent>
        </Card>
    )

    const curves = (
        <div className="space-y-4">
            <Card size="flush" className="px-5 py-4">
                <CurvesChart approval={approvalCurve} support={supportCurve} currentApproval={currentApproval} currentSupport={currentSupport} now={now} hours={decisionHours} deciding={deciding} />
            </Card>
            <ActionList rows={actions} decimals={chain.decimals} symbol={chain.symbol} />
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
                    <ProposalTree nodes={nodes} chain={chain} best={heads.best} party={party} />
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
        <TimelineList empty={data.metadataActions.length === 0}>
            {data.metadataActions.map(a => (
                <TimelineItem
                    key={a.id}
                    tone={a.method === 'MetadataSet' ? 'primary' : 'idle'}
                    icon={a.method === 'MetadataSet' ? RING : CROSS}
                    title={a.method === 'MetadataSet' ? 'Text set' : 'Text cleared'}
                    iso={a.timestamp}
                    links={<BlockLink height={a.block} />}
                    detail={
                        a.method === 'MetadataSet' ? (
                            <div className="min-w-0">
                                {a.title ? (
                                    <p className="text-sm font-semibold">{a.title}</p>
                                ) : (
                                    <p className="text-sm text-dim">Nothing read back from the preimage</p>
                                )}
                                {a.description && <p className="mt-1.5 text-sm whitespace-pre-wrap">{a.description}</p>}
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
        <TimelineList empty={trail.length === 0}>
            {[...trail].reverse().map((s, i) => {
                const e = evBy.get(s.event)
                const rows = stepRows(e?.args, s.name === 'Referenda.DecisionDepositPlaced' ? 'Decision deposit' : 'Amount')
                // the Submitted event names neither party nor deposit, the
                // referendum record fills the step in
                if (s.name === 'Referenda.Submitted') {
                    if (r.submitter) rows.unshift(['Who', <AccountLink key="s" addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} />])
                    if (r.submissionDeposit != null) rows.push(['Submission deposit', fmtBalance(r.submissionDeposit, chain.decimals, chain.symbol)])
                }
                return (
                    <TimelineItem
                        key={i}
                        tone={STEP_TONE[s.name] ?? 'idle'}
                        icon={STEP_ICON(s.name)}
                        title={STEP_LABEL[s.name] ?? camelLabel(s.name.split('.')[1])}
                        iso={s.timestamp}
                        links={
                            <>
                                <BlockLink height={s.block} />
                                {e?.extrinsic && <ExtrinsicLink id={e.extrinsic.id} hash={e.extrinsic.hash} />}
                            </>
                        }
                        detail={rows.length > 0 ? <TimelineRows rows={rows} /> : undefined}
                    />
                )
            })}
        </TimelineList>
    )

    const entry = (v: (typeof data.votes)[number]): VoteEntry => {
        const list = byTarget.get(v.voter!.id) ?? []
        const num = (planck: string | bigint) => planckToNum(planck, chain.decimals)
        return {
            id: v.id,
            addr: ss58Encode(v.voter!.id, chain.ss58),
            acc: v.voter,
            conviction: v.kind === 'Standard' ? convictionLabel(v.conviction) : null,
            capital: num(capitalOf(v)),
            selfVotes: num(votesOf(v)),
            delegatorCount: list.length,
            delegatedCapital: list.reduce((n, d) => n + num(d.balance), 0),
            delegatedVotes: list.reduce((n, d) => n + num(weigh(d.balance, d.conviction)), 0),
            delegators: list.slice(0, INLINE_DELEGATORS).map(d => ({
                addr: ss58Encode(d.who.id, chain.ss58),
                acc: whoRefs.get(d.who.id),
                conviction: convictionLabel(d.conviction),
                capital: num(d.balance),
                votes: num(weigh(d.balance, d.conviction)),
            })),
        }
    }

    const bucket = (decision: string) => data.votes.filter(v => v.voter != null && decisionOf(v) === decision).map(entry)
    const groups = [
        {label: 'Aye', total: data.ayeCount.totalCount, rows: bucket('aye')},
        {label: 'Nay', total: data.nayCount.totalCount, rows: bucket('nay')},
        {label: 'Abstain', total: data.abstainCount.totalCount, rows: bucket('abstain')},
    ]
    // split votes are rare, they only earn a list when the referendum has any
    if (data.splitCount.totalCount > 0) groups.push({label: 'Split', total: data.splitCount.totalCount, rows: bucket('split')})

    const votes = <VoteLists groups={groups} symbol={chain.symbol} partial={dels.delegations.length < dels.conn.totalCount} />

    return (
        <div>
            <h1 className="mt-6 text-lg font-semibold">Referendum #{r.index}</h1>

            {/* one flat grid, so a phone reads the card, then status and tally,
                then the tab panels. the 1fr row soaks up the side pair's
                overshoot so the span cannot inflate the card row */}
            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px] lg:grid-rows-[auto_1fr]">
                <Card size="flush" className="min-w-0 px-7 py-5">
                    <p className="text-base font-semibold">{r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {r.submitter ? <AccountLink addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} /> : NONE}
                        <span className="text-dim">·</span>
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs text-muted-foreground">
                            {trackLabel(r.track.name)}
                        </Badge>
                        <span className="text-dim">·</span>
                        <span className="-ml-0.5 text-muted-foreground">
                            <TimeCell iso={r.submittedTimestamp} cycle />
                        </span>
                        <StatusBadge phase={phaseOf(r)} className="ml-auto" />
                    </div>
                    <Separator className="my-4" />
                    {r.description ? (
                        <p className="text-sm whitespace-pre-wrap">{r.description}</p>
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
                        {slug: 'text', label: 'Text history', count: data.metadataActions.length, body: () => texts},
                        {slug: 'timeline', label: 'Timeline', count: trail.length, body: () => timeline},
                        {slug: 'votes', label: 'Votes', count: data.voteCount.totalCount, body: () => votes},
                        {slug: 'curves', label: 'Curves', body: () => curves},
                    ]}
                />
            </div>
        </div>
    )
}
