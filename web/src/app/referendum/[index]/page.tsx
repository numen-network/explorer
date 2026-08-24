import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {DetailCard, DetailRow} from '@/components/Detail'
import {TabPanels} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {CurvesChart} from '@/components/charts'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Gauge, StatusBadge} from '@/components/referenda'
import Timeline, {CROSS, RING, TICK, rawSteps, sentenceCase} from '@/components/timeline'
import VoteLists, {type VoteEntry} from '@/components/votes'
import {chainHeads, chainProps} from '@/lib/chain'
import {curveAt, curveSamples, type Curve} from '@/lib/curves'
import {fmtBalance, fmtBlockSpan, fmtCompact, fmtInt, planckToNum} from '@/lib/format'
import {accountRefs, blockTimes, delegationsFor, referendumDetail} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: PageProps<'/referendum/[index]'>) {
    const {index} = await props.params
    return {title: `Referendum #${index}`}
}

const STATUS_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'idle' | 'accent'> = {
    SUBMITTED: 'idle',
    DECIDING: 'accent',
    CONFIRMING: 'warn',
    APPROVED: 'pos',
    REJECTED: 'neg',
    TIMEDOUT: 'idle',
    CANCELLED: 'idle',
    KILLED: 'neg',
}

const trackLabel = (name: string) => name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

const STEP_ICON = (status: string) =>
    status === 'APPROVED' ? TICK : /REJECTED|KILLED|CANCELLED|TIMEDOUT/.test(status) ? CROSS : RING

function Mark({path, className}: {path: string; className: string}) {
    return (
        <svg width="14" height="14" viewBox="0 0 16 16" className={`shrink-0 ${className}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d={path} />
        </svg>
    )
}

function PhaseBar({label, span, at}: {label: string; span: string; at: number | null}) {
    return (
        <div>
            <div className="h-2 overflow-hidden rounded-full bg-bg">
                {at !== null && <div className="h-full bg-accent" style={{width: `${Math.min(100, Math.max(0, at * 100))}%`}} />}
            </div>
            <div className="mt-1.5 flex items-baseline justify-between text-sm">
                <span className="text-sub">{label}</span>
                <span className="font-mono">{span}</span>
            </div>
        </div>
    )
}

function Slot({value, label, className = ''}: {value: string; label: string; className?: string}) {
    return (
        <div className={`min-w-0 ${className}`}>
            <div className="font-mono">{value}</div>
            <div className="text-faint">{label}</div>
        </div>
    )
}

// none locks nothing and counts a tenth, the rest count their own multiple
const convictionMul = (c: string | null) => (c == null ? 1 : c === '0x' ? 0.1 : Number(c.slice(0, -1)))

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
    const heights = [...new Set([r.submittedAt, ...trail.map(s => s.block)])]
    const voterIds = [...new Set(data.votes.map(v => v.voter?.id).filter((id): id is string => id != null))]
    const [times, refs, dels] = await Promise.all([
        blockTimes(heights),
        accountRefs(r.proposalBeneficiary ? [r.proposalBeneficiary] : []),
        delegationsFor(voterIds, r.track.id),
    ])
    const stamps = new Map(times.blocks.map(b => [b.height, b.timestamp]))
    const beneficiary = refs.accounts[0]

    const latest = data.dailyStats[0]
    const activeIssuance = latest ? planckToNum(BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive), chain.decimals) : 0
    const ayes = planckToNum(r.ayes, chain.decimals)
    const nays = planckToNum(r.nays, chain.decimals)
    const supportVal = planckToNum(r.support, chain.decimals)
    const total = ayes + nays
    const approvalNow = total > 0 ? (ayes / total) * 100 : 0
    const supportNow = activeIssuance > 0 ? (supportVal / activeIssuance) * 100 : 0

    const decisionHours = Math.max(1, Math.round((r.track.decisionPeriod * chain.blockTime) / 3600))
    const approvalCurve = curveSamples(r.track.minApproval as Curve, decisionHours)
    const supportCurve = curveSamples(r.track.minSupport as Curve, decisionHours)
    const live = r.status === 'DECIDING' || r.status === 'CONFIRMING'
    const x =
        live && r.decidingSince !== null && r.track.decisionPeriod > 0
            ? Math.min(100, ((heads.best - r.decidingSince) / r.track.decisionPeriod) * 100)
            : null
    const now = x !== null ? {at: (x / 100) * decisionHours, approval: approvalNow, support: supportNow} : null

    const ended = r.endedAt !== null
    const decisionAt = r.decidingSince !== null && r.track.decisionPeriod > 0 ? (heads.best - r.decidingSince) / r.track.decisionPeriod : null
    const confirmAt = r.confirmingSince !== null && r.track.confirmPeriod > 0 ? (heads.best - r.confirmingSince) / r.track.confirmPeriod : null
    const approvalNeed = x !== null ? curveAt(r.track.minApproval as Curve, x / 100) * 100 : null
    const supportNeed = x !== null ? curveAt(r.track.minSupport as Curve, x / 100) * 100 : null
    const pct = (n: number) => `${n.toFixed(n < 1 ? 2 : 1)}%`

    const status = !ended && (
        <div className="card px-5 py-4">
            <h2 className="text-[15px] font-semibold">Status</h2>
            <div className="mt-3 space-y-4">
                <PhaseBar label="Decision" span={fmtBlockSpan(r.track.decisionPeriod, chain.blockTime)} at={decisionAt} />
                <PhaseBar label="Confirmation" span={fmtBlockSpan(r.track.confirmPeriod, chain.blockTime)} at={confirmAt} />
            </div>
            <div className="mt-4 flex items-baseline justify-between border-t border-edge pt-3 text-sm">
                <span className="text-sub">Attempts</span>
                <span className="font-mono">{trail.filter(s => s.status === 'confirming').length}</span>
            </div>
        </div>
    )

    const tally = (
        <div className="card px-5 py-4">
            <h2 className="text-[15px] font-semibold">Tally</h2>

            <div className="mt-3">
                <Gauge value={total > 0 ? approvalNow : null} need={approvalNeed} variant="split" />
            </div>
            <div className="mt-1.5 flex text-[11px]">
                <Slot className="flex-1 text-left text-pos" value={pct(approvalNow)} label="Aye" />
                <Slot className="flex-1 text-center text-sub" value={approvalNeed !== null ? pct(approvalNeed) : '—'} label="Threshold" />
                <Slot className="flex-1 text-right text-neg" value={pct(total > 0 ? 100 - approvalNow : 0)} label="Nay" />
            </div>

            <div className="mt-4 divide-y divide-edge border-t border-edge text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark path={TICK} className="text-pos" />
                        Aye <span className="text-faint">({fmtInt(data.ayeCount.totalCount)})</span>
                    </span>
                    <span className="font-mono">
                        {fmtCompact(ayes)} {chain.symbol}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-center gap-1.5">
                        <Mark path={CROSS} className="text-neg" />
                        Nay <span className="text-faint">({fmtInt(data.nayCount.totalCount)})</span>
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
                <Slot className="text-accent" value={pct(supportNow)} label="Support" />
                <Slot className="text-right text-sub" value={supportNeed !== null ? pct(supportNeed) : '—'} label="Threshold" />
            </div>

            <div className="mt-4 divide-y divide-edge border-t border-edge text-sm">
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sub">Support</span>
                    <span className="font-mono">
                        {fmtCompact(supportVal)} {chain.symbol}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-sub">Active issuance</span>
                    <span className="font-mono">
                        {fmtCompact(activeIssuance)} {chain.symbol}
                    </span>
                </div>
            </div>
        </div>
    )

    const curves = (
        <div className="card px-5 py-4">
            <CurvesChart approval={approvalCurve} support={supportCurve} now={now} hours={decisionHours} />
        </div>
    )

    const call = (
        <DetailCard>
            <DetailRow label="Call">
                <span className="font-mono text-[13px]">{r.proposalCall ?? '—'}</span>
            </DetailRow>
            <DetailRow label="Amount">{r.proposalAmount ? fmtBalance(r.proposalAmount, chain.decimals, chain.symbol) : '—'}</DetailRow>
            <DetailRow label="Beneficiary">
                {r.proposalBeneficiary ? <AccountLink full addr={ss58Encode(r.proposalBeneficiary, chain.ss58)} acc={beneficiary} /> : '—'}
            </DetailRow>
        </DetailCard>
    )

    const metadata = (
        <DetailCard>
            <DetailRow label="Index">{r.index}</DetailRow>
            <DetailRow label="Track">
                {trackLabel(r.track.name)} <span className="text-sub">#{r.track.id}</span>
            </DetailRow>
            <DetailRow label="Origin">{r.origin ?? '—'}</DetailRow>
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
        </DetailCard>
    )

    const timeline = (
        <Timeline
            steps={trail.map(s => {
                const key = s.status.toUpperCase()
                return {block: s.block, label: sentenceCase(s.status), iso: stamps.get(s.block), tone: STATUS_TONE[key] ?? 'idle', icon: STEP_ICON(key)}
            })}
        />
    )

    const byTarget = new Map<string, typeof dels.delegations>()
    for (const d of dels.delegations) byTarget.set(d.target.id, [...(byTarget.get(d.target.id) ?? []), d])

    const shown = [...new Set([...byTarget.values()].flatMap(list => list.slice(0, INLINE_DELEGATORS).map(d => d.who.id)))]
    const whoRefs = new Map((await accountRefs(shown)).accounts.map(a => [a.id, a]))

    const entry = (v: (typeof data.votes)[number]): VoteEntry => {
        const capital = planckToNum(v.amount, chain.decimals)
        const list = byTarget.get(v.voter!.id) ?? []
        const pledged = (d: (typeof list)[number]) => planckToNum(d.balance, chain.decimals)
        return {
            id: v.id,
            addr: ss58Encode(v.voter!.id, chain.ss58),
            acc: v.voter,
            conviction: v.conviction,
            capital,
            selfVotes: capital * convictionMul(v.conviction),
            delegatorCount: list.length,
            delegatedCapital: list.reduce((n, d) => n + pledged(d), 0),
            delegatedVotes: list.reduce((n, d) => n + pledged(d) * convictionMul(d.conviction), 0),
            delegators: list.slice(0, INLINE_DELEGATORS).map(d => ({
                addr: ss58Encode(d.who.id, chain.ss58),
                acc: whoRefs.get(d.who.id),
                conviction: d.conviction,
                capital: pledged(d),
                votes: pledged(d) * convictionMul(d.conviction),
            })),
        }
    }

    const bucket = (decision: string) => data.votes.filter(v => v.voter != null && v.decision === decision).map(entry)
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

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] items-start gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
                <div className="min-w-0">
                <div className="card px-7 py-5">
                    <p className="text-base font-semibold">{r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                        {r.submitter ? <AccountLink addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} /> : <span className="text-faint">—</span>}
                        <span className="text-faint">·</span>
                        <span className="rounded-full bg-bg px-3 py-1 text-sub">{trackLabel(r.track.name)}</span>
                        <span className="text-faint">·</span>
                        <span className="-ml-0.5 text-sub">
                            {stamps.has(r.submittedAt) ? <TimeCell iso={stamps.get(r.submittedAt)!} cycle /> : <BlockLink height={r.submittedAt} />}
                        </span>
                        <StatusBadge status={r.status} className="ml-auto" />
                    </div>
                    <div className="my-4 h-px bg-edge" />
                    {r.description ? (
                        <p className="text-sm whitespace-pre-wrap">{r.description}</p>
                    ) : (
                        <p className="py-4 text-center text-sm text-faint">No description provided.</p>
                    )}
                </div>

                    <TabPanels
                        at={tab}
                        href={s => `/referendum/${r.index}?tab=${s}`}
                        panels={[
                            {slug: 'call', label: 'Call', body: () => call},
                            {slug: 'metadata', label: 'Metadata', body: () => metadata},
                            {slug: 'timeline', label: 'Timeline', count: trail.length, body: () => timeline},
                            {slug: 'votes', label: 'Votes', count: data.voteCount.totalCount, body: () => votes},
                            {slug: 'curves', label: 'Curves', body: () => curves},
                        ]}
                    />
                </div>

                <div className="space-y-4">
                    {status}
                    {tally}
                </div>
            </div>
        </div>
    )
}
