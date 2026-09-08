import Link from 'next/link'
import {FileText} from 'lucide-react'
import AccountLink from '@/components/AccountLink'
import {BountyTable} from '@/components/BountyTable'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {Tip} from '@/components/Tip'
import {FilterChip} from '@/components/pills'
import {ThresholdChart} from '@/components/charts'
import {payouts, StatusBadge, ThresholdBar} from '@/components/referenda'
import {Badge} from '@/components/ui/badge'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {curveAt, type Curve} from '@/lib/curves'
import {chainHeads, chainProps} from '@/lib/chain'
import {camelLabel, fmtCompact, fmtCompact3, fmtInt, planckToNum, trackLabel} from '@/lib/format'
import {isLive, phaseFraction, phaseOf} from '@/lib/referendum'
import {bountiesPage, governanceSummary, referendaPage, tracksPage, treasurySpendsPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {TracksTable, TreasuryTable} from './tables'
import {NONE} from '@/components/Detail'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Governance'}

const TABS = ['referenda', 'treasury', 'bounties', 'tracks'] as const
type Tab = (typeof TABS)[number]

// the Treasury call families, the Treasury events a spend can end on and the
// BountyStatus variants plus the events that drop a bounty
const SPEND_KINDS = ['spend_local', 'spend']
const SPEND_STATUSES = ['SpendApproved', 'Awarded', 'AssetSpendApproved', 'Paid', 'AssetSpendVoided', 'PaymentFailed', 'SpendProcessed']
const BOUNTY_STATUSES = ['Proposed', 'Approved', 'ApprovedWithCurator', 'Funded', 'CuratorProposed', 'Active', 'PendingPayout', 'BountyClaimed', 'BountyRejected', 'BountyCanceled']
const SPEND_KIND_LABEL: Record<string, string> = {spend_local: 'Local', spend: 'Spend'}

export default async function GovernancePage(props: PageProps<'/governance'>) {
    const sp = await props.searchParams
    const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as Tab) : 'referenda'
    const pg = paging(sp)
    const [chain, heads, sum] = await Promise.all([chainProps(), chainHeads(), governanceSummary()])
    const trackIds = sum.trackList.map(t => t.id)
    const chosen = (v: unknown, values: string[]) => (values.includes(String(v)) ? String(v) : '')
    const track = chosen(sp.track, trackIds)
    const kind = chosen(sp.kind, SPEND_KINDS)
    const status = chosen(sp.status, tab === 'bounties' ? BOUNTY_STATUSES : SPEND_STATUSES)
    const on = {kind, status, track}

    const [refs, spends, bounties, tracks] = await Promise.all([
        tab === 'referenda' ? referendaPage(pg.size, pg.offset, track || undefined) : null,
        tab === 'treasury' ? treasurySpendsPage(pg.size, pg.offset, {kind: SPEND_KINDS, status: SPEND_STATUSES, track: trackIds}, on) : null,
        tab === 'bounties' ? bountiesPage(pg.size, pg.offset, {status: BOUNTY_STATUSES, track: trackIds}, {status, track}) : null,
        tab === 'tracks' ? tracksPage(pg.size, pg.offset) : null,
    ])

    const latest = sum.dailyStats[0]
    const activeIssuance = latest ? BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive) : 0n
    const pageTotal = {referenda: refs?.conn.totalCount ?? 0, treasury: spends?.total ?? 0, bounties: bounties?.total ?? 0, tracks: sum.tracks.totalCount}[tab]

    // a chip keeps the other dimensions and drops paging
    const facetHref = (field: string, value: string) => {
        const next: Record<string, string> = {tab, ...on, ...(field ? {[field]: value} : {})}
        return `/governance?${Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')}`
    }
    const FacetRow = ({label, field, values, counts, labelOf}: {label: string; field: string; values: string[]; counts: Record<string, number>; labelOf: (v: string) => string}) => {
        const live = values.filter(v => (counts[v] ?? 0) > 0 || on[field as keyof typeof on] === v)
        if (live.length === 0) return null
        return (
            <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 w-12 shrink-0 text-xs text-muted-foreground">{label}</span>
                <FilterChip label="All" href={facetHref(field, '')} active={!on[field as keyof typeof on]} />
                {live.map(v => (
                    <FilterChip key={v} label={labelOf(v)} count={counts[v] ?? 0} href={facetHref(field, v)} active={on[field as keyof typeof on] === v} />
                ))}
            </div>
        )
    }
    const trackName = (id: string) => trackLabel(sum.trackList.find(t => t.id === id)?.name ?? id)

    const spendFilter = spends && (
        <div className="mb-4 space-y-2">
            <FacetRow label="Kind" field="kind" values={SPEND_KINDS} counts={spends.counts.kind ?? {}} labelOf={v => SPEND_KIND_LABEL[v]} />
            <FacetRow label="Status" field="status" values={SPEND_STATUSES} counts={spends.counts.status ?? {}} labelOf={camelLabel} />
            <FacetRow label="Track" field="track" values={trackIds} counts={spends.counts.track ?? {}} labelOf={trackName} />
        </div>
    )
    const bountyFilter = bounties && (
        <div className="mb-4 space-y-2">
            <FacetRow label="Status" field="status" values={BOUNTY_STATUSES} counts={bounties.counts.status ?? {}} labelOf={camelLabel} />
            <FacetRow label="Track" field="track" values={trackIds} counts={bounties.counts.track ?? {}} labelOf={trackName} />
        </div>
    )

    const trackFilter = refs && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-muted-foreground">Track</span>
            <FilterChip label="All" href="/governance?tab=referenda" active={!track} />
            {sum.trackList.map(t => (
                <FilterChip key={t.id} label={trackLabel(t.name)} href={`/governance?tab=referenda&track=${t.id}`} active={track === t.id} />
            ))}
        </div>
    )

    const referenda = refs && (
        <div className="space-y-3">
            {refs.referendums.length === 0 && (
                <Card size="flush" className="px-6 py-6 text-sm text-muted-foreground">
                    {track ? 'No referenda on this track.' : 'No referenda yet.'}
                </Card>
            )}
            {refs.referendums.map(r => {
                const ayes = BigInt(r.ayes)
                const nays = BigInt(r.nays)
                const ran = isLive(r) ? phaseFraction(r.decidingSince, r.track.decisionPeriod, heads.best) : null
                const at = ran !== null ? Math.min(1, Math.max(0, ran)) : null
                const approval = ayes + nays > 0n ? Number((ayes * 10000n) / (ayes + nays)) / 100 : 0
                const support = activeIssuance > 0n ? Number((BigInt(r.support) * 1000000n) / activeIssuance) / 10000 : 0
                const title = r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`
                return (
                    <Card key={r.id} size="flush" className="px-7 py-5">
                        <div className="flex items-baseline justify-between gap-6">
                            <div className="flex min-w-0 items-baseline gap-2">
                                <Tip text={r.title}>
                                    <Link href={`/referendum/${r.index}`} className="group min-w-0 truncate text-[15px]">
                                        <span>#{r.index}</span>
                                        <span className="mx-2.5 text-dim">·</span>
                                        <span className="font-semibold group-hover:text-primary">{title}</span>
                                    </Link>
                                </Tip>
                                {r.description && (
                                    <Tip text={<span className="max-w-sm whitespace-pre-wrap">{r.description}</span>}>
                                        <span className="relative top-[2px] shrink-0 cursor-help text-dim hover:text-muted-foreground">
                                            <FileText className="size-3.5" />
                                        </span>
                                    </Tip>
                                )}
                            </div>
                            <span className="shrink-0 text-sm">
                                {r.proposalAmount != null ? (
                                    <>
                                        <span className="font-semibold">{fmtInt(Math.round(planckToNum(r.proposalAmount, chain.decimals)))}</span>{' '}
                                        <span className="font-medium text-dim">{chain.symbol}</span>
                                        {payouts(r.proposalCalls) > 1 && <span className="text-muted-foreground"> · {payouts(r.proposalCalls)} payouts</span>}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">{r.proposalMethod ?? ''}</span>
                                )}
                            </span>
                        </div>
                        <Separator className="my-3" />
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex min-w-0 items-center gap-2 text-xs">
                                {r.submitter ? (
                                    <AccountLink addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} />
                                ) : (
                                    NONE
                                )}
                                <span className="text-dim">·</span>
                                <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs text-muted-foreground">
                                    {trackLabel(r.track.name)}
                                </Badge>
                                <span className="text-dim">·</span>
                                <span className="-ml-0.5 text-muted-foreground">
                                    <TimeCell iso={r.submittedTimestamp} cycle />
                                </span>
                            </div>
                            <StatusBadge phase={phaseOf(r)} />
                        </div>
                        {at !== null && (
                            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-3 sm:grid-cols-2">
                                <ThresholdBar
                                    label="Approval"
                                    variant="split"
                                    value={ayes + nays > 0n ? approval : null}
                                    need={curveAt(r.track.minApproval as Curve, at) * 100}
                                    foot={
                                        <>
                                            <span>aye {fmtCompact(planckToNum(r.ayes, chain.decimals))}</span>
                                            <span>nay {fmtCompact(planckToNum(r.nays, chain.decimals))}</span>
                                        </>
                                    }
                                />
                                <ThresholdBar
                                    label="Support"
                                    variant="solid"
                                    value={support}
                                    need={curveAt(r.track.minSupport as Curve, at) * 100}
                                    foot={
                                        <>
                                            <span>voted {fmtCompact(planckToNum(r.support, chain.decimals))}</span>
                                            <span>of {fmtCompact(planckToNum(activeIssuance.toString(), chain.decimals))}</span>
                                        </>
                                    }
                                />
                            </div>
                        )}
                    </Card>
                )
            })}
        </div>
    )

    const trackCurves = tracks && (
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-2 xl:grid-cols-3">
            {tracks.tracks.map(t => (
                <Card key={t.id} className="gap-0 py-4 [--card-spacing:--spacing(5)]">
                    <CardHeader>
                        <CardTitle className="text-[13px] leading-normal">{trackLabel(t.name)}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ThresholdChart
                            approval={t.minApproval as Curve}
                            support={t.minSupport as Curve}
                            hours={Math.max(1, Math.round((t.decisionPeriod * chain.blockTime) / 3600))}
                        />
                    </CardContent>
                </Card>
            ))}
        </div>
    )

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Governance</h1>
            </div>

            <div className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatTile label="Referenda" value={fmtInt(sum.refs.totalCount)} />
                <StatTile label="Ongoing" value={fmtInt(sum.ongoing.totalCount)} />
                <StatTile label="Treasury pot" value={latest ? fmtCompact3(latest.treasuryPot, chain.decimals, chain.symbol) : '—'} />
                <StatTile label="Active issuance" value={fmtCompact3(activeIssuance, chain.decimals, chain.symbol)} />
            </div>

            <div className="mt-7">
                <TabBar
                    items={[
                        {label: 'Referenda', count: sum.refs.totalCount, href: '/governance?tab=referenda', active: tab === 'referenda'},
                        {label: 'Treasury spends', count: sum.spends.totalCount, href: '/governance?tab=treasury', active: tab === 'treasury'},
                        {label: 'Bounties', count: sum.bounties.totalCount, href: '/governance?tab=bounties', active: tab === 'bounties'},
                        {label: 'Tracks', count: sum.tracks.totalCount, href: '/governance?tab=tracks', active: tab === 'tracks'},
                    ]}
                />
                <div className="mt-4">
                    {trackFilter}
                    {referenda}
                    {spendFilter}
                    {spends && (
                        <Card size="flush">
                            <TreasuryTable rows={spends.rows} chain={chain} />
                        </Card>
                    )}
                    {bountyFilter}
                    {bounties && <BountyTable rows={bounties.rows} chain={chain} />}
                    {tracks && (
                        <Card size="flush">
                            <TracksTable rows={tracks.tracks} chain={chain} />
                        </Card>
                    )}
                    {trackCurves}
                </div>
                <Pager paging={pg} total={pageTotal} href={facetHref('', '')} />
            </div>
        </div>
    )
}
