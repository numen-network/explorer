import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'
import {BlockLink} from '@/components/links'
import {FilterChip, Tag} from '@/components/pills'
import {BountyTable, RefCell} from '@/components/bounties'
import {StatusBadge, ThresholdBar} from '@/components/referenda'
import {curveAt, type Curve} from '@/lib/curves'
import {chainHeads, chainProps} from '@/lib/chain'
import {fmtBalance, fmtBlockSpan, fmtCompact, fmtInt, planckToNum} from '@/lib/format'
import {blockTimes, bountiesPage, governanceSummary, referendaPage, tracksPage, treasurySpendsPage} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Governance'}

const TABS = ['referenda', 'treasury', 'bounties', 'tracks'] as const
type Tab = (typeof TABS)[number]
const PAGE = 20

const trackLabel = (name: string) => name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')
const spaced = (s: string) => {
    const t = s.split('_').join(' ')
    return t[0].toUpperCase() + t.slice(1)
}

// closed sets written by the indexer, see squid governance.ts and bounties.ts
const SPEND_KINDS = ['local', 'spend']
const SPEND_STATUSES = ['approved', 'paid']
const BOUNTY_STATUSES = ['proposed', 'approved', 'funded', 'curator_proposed', 'active', 'pending_payout', 'claimed', 'rejected', 'cancelled']

export default async function GovernancePage(props: PageProps<'/governance'>) {
    const sp = await props.searchParams
    const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as Tab) : 'referenda'
    const page = Math.max(1, Number(sp.page) || 1)
    const offset = (page - 1) * PAGE
    const track = sp.track ? String(sp.track) : ''
    const kind = sp.kind ? String(sp.kind) : ''
    const status = sp.status ? String(sp.status) : ''
    const on = {kind, status, track}
    const [chain, heads, sum] = await Promise.all([chainProps(), chainHeads(), governanceSummary()])
    const trackIds = sum.trackList.map(t => t.id)

    const [refs, spends, bounties, tracks] = await Promise.all([
        tab === 'referenda' ? referendaPage(PAGE, offset, track || undefined) : null,
        tab === 'treasury' ? treasurySpendsPage(PAGE, offset, {kind: SPEND_KINDS, status: SPEND_STATUSES, track: trackIds}, on) : null,
        tab === 'bounties' ? bountiesPage(PAGE, offset, {status: BOUNTY_STATUSES, track: trackIds}, {status, track}) : null,
        tab === 'tracks' ? tracksPage(PAGE, offset) : null,
    ])

    const heights = refs ? [...new Set(refs.referendums.map(r => r.submittedAt))] : []
    const stamps = new Map(heights.length ? (await blockTimes(heights)).blocks.map(b => [b.height, b.timestamp]) : [])

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
                <span className="mr-1 w-12 shrink-0 text-xs text-sub">{label}</span>
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
            <FacetRow label="Kind" field="kind" values={SPEND_KINDS} counts={spends.counts.kind ?? {}} labelOf={spaced} />
            <FacetRow label="Status" field="status" values={SPEND_STATUSES} counts={spends.counts.status ?? {}} labelOf={spaced} />
            <FacetRow label="Track" field="track" values={trackIds} counts={spends.counts.track ?? {}} labelOf={trackName} />
        </div>
    )
    const bountyFilter = bounties && (
        <div className="mb-4 space-y-2">
            <FacetRow label="Status" field="status" values={BOUNTY_STATUSES} counts={bounties.counts.status ?? {}} labelOf={spaced} />
            <FacetRow label="Track" field="track" values={trackIds} counts={bounties.counts.track ?? {}} labelOf={trackName} />
        </div>
    )

    const trackFilter = refs && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-sub">Track</span>
            <FilterChip label="All" href="/governance?tab=referenda" active={!track} />
            {sum.trackList.map(t => (
                <FilterChip key={t.id} label={trackLabel(t.name)} href={`/governance?tab=referenda&track=${t.id}`} active={track === t.id} />
            ))}
        </div>
    )

    const referenda = refs && (
        <div className="space-y-3">
            {refs.referendums.length === 0 && (
                <div className="card px-6 py-6 text-sm text-sub">{track ? 'No referenda on this track.' : 'No referenda yet.'}</div>
            )}
            {refs.referendums.map(r => {
                const ayes = BigInt(r.ayes)
                const nays = BigInt(r.nays)
                const live = r.status === 'DECIDING' || r.status === 'CONFIRMING'
                const at =
                    live && r.decidingSince != null && r.track.decisionPeriod > 0
                        ? Math.min(1, Math.max(0, (heads.best - r.decidingSince) / r.track.decisionPeriod))
                        : null
                const approval = ayes + nays > 0n ? Number((ayes * 10000n) / (ayes + nays)) / 100 : 0
                const support = activeIssuance > 0n ? Number((BigInt(r.support) * 1000000n) / activeIssuance) / 10000 : 0
                return (
                    <div key={r.id} className="card px-7 py-5">
                        <div className="flex items-baseline justify-between gap-6">
                            <div className="flex min-w-0 items-baseline gap-2">
                                <Link href={`/referendum/${r.index}`} className="group min-w-0 truncate text-[15px]" title={r.title ?? undefined}>
                                    <span>#{r.index}</span>
                                    <span className="mx-2.5 text-faint">·</span>
                                    <span className="font-semibold group-hover:text-accent">
                                        {r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`}
                                    </span>
                                </Link>
                                {r.description && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="relative top-[2px] shrink-0 cursor-help text-sm text-faint hover:text-sub">
                                                    <svg width="1em" height="1em" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
                                                        <rect x="3.2" y="2" width="9.6" height="12" rx="1.6" />
                                                        <path d="M5.6 5.4h4.8M5.6 8h4.8M5.6 10.6h2.8" />
                                                    </svg>
                                                </span>
                                            </TooltipTrigger>
                                            <TooltipContent side="top" align="start" sideOffset={4} className="max-w-sm whitespace-pre-wrap">
                                                {r.description}
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                            <span className="shrink-0 text-sm">
                                {r.proposalAmount != null ? (
                                    <>
                                        <span className="font-semibold">{fmtInt(Math.round(planckToNum(r.proposalAmount, chain.decimals)))}</span>{' '}
                                        <span className="font-medium text-faint">{chain.symbol}</span>
                                    </>
                                ) : (
                                    <span className="text-sub">{r.proposalCall?.split('.')[1] ?? ''}</span>
                                )}
                            </span>
                        </div>
                        <div className="my-3 h-px bg-edge" />
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex min-w-0 items-center gap-2 text-xs">
                                {r.submitter ? (
                                    <AccountLink addr={ss58Encode(r.submitter.id, chain.ss58)} acc={r.submitter} />
                                ) : (
                                    <span className="text-faint">—</span>
                                )}
                                <span className="text-faint">·</span>
                                <span className="rounded-full bg-bg px-3 py-1 text-sub">{trackLabel(r.track.name)}</span>
                                <span className="text-faint">·</span>
                                <span className="-ml-0.5 text-sub">
                                    {stamps.has(r.submittedAt) ? (
                                        <TimeCell iso={stamps.get(r.submittedAt)!} cycle />
                                    ) : (
                                        <Link href={`/block/${r.submittedAt}`} className="hover:text-accent">{`#${fmtInt(r.submittedAt)}`}</Link>
                                    )}
                                </span>
                            </div>
                            <StatusBadge status={r.status} />
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
                    </div>
                )
            })}
        </div>
    )

    const treasury = spends && (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_minmax(18ch,1fr)_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Id</th>
                        <th>Kind</th>
                        <th>Beneficiary</th>
                        <th>Referendum</th>
                        <th>Status</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Block</th>
                    </tr>
                </thead>
                <tbody>
                    {spends.rows.length === 0 && (
                        <tr>
                            <td colSpan={6} className="py-6 text-sub">
                                No spends yet.
                            </td>
                        </tr>
                    )}
                    {spends.rows.map(s => (
                        <tr key={s.id}>
                            <td className="font-mono text-xs">#{s.id.split('-')[1]}</td>
                            <td className="text-[13px]">{s.kind}</td>
                            <td>
                                {s.beneficiary ? <AccountLink addr={ss58Encode(s.beneficiary.id, chain.ss58)} acc={s.beneficiary} /> : <span className="text-faint">—</span>}
                            </td>
                            <td>
                                <RefCell r={s.referendum} />
                            </td>
                            <td>
                                <Tag text={s.status} tone={s.status === 'paid' ? 'pos' : s.status === 'approved' ? 'warn' : 'idle'} />
                            </td>
                            <td className="text-right font-mono">{fmtBalance(s.amount, chain.decimals, chain.symbol)}</td>
                            <td className="text-right">
                                <BlockLink height={s.block} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    // periods are stored in blocks, the block count stays on hover
    const span = (blocks: number) => <span title={`${fmtInt(blocks)} blocks`}>{fmtBlockSpan(blocks, chain.blockTime)}</span>

    const trackList = tracks && (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Track</th>
                        <th className="text-right">Max spend</th>
                        <th className="text-right">Max deciding</th>
                        <th className="text-right">Decision deposit</th>
                        <th className="text-right">Prepare</th>
                        <th className="text-right">Decision</th>
                        <th className="text-right">Confirm</th>
                        <th className="text-right">Min enactment</th>
                    </tr>
                </thead>
                <tbody>
                    {tracks.tracks.map(t => (
                        <tr key={t.id}>
                            <td className="text-[13px] font-medium">{trackLabel(t.name)}</td>
                            <td className="text-right font-mono">{fmtBalance(t.maxSpend, chain.decimals, chain.symbol)}</td>
                            <td className="text-right font-mono">{t.maxDeciding}</td>
                            <td className="text-right font-mono">{fmtBalance(t.decisionDeposit, chain.decimals, chain.symbol)}</td>
                            <td className="text-right font-mono">{span(t.preparePeriod)}</td>
                            <td className="text-right font-mono">{span(t.decisionPeriod)}</td>
                            <td className="text-right font-mono">{span(t.confirmPeriod)}</td>
                            <td className="text-right font-mono">{span(t.minEnactmentPeriod)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
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
                <StatTile label="Treasury pot" value={latest ? `${fmtCompact(planckToNum(latest.treasuryPot, chain.decimals))} ${chain.symbol}` : '—'} />
                <StatTile label="Active issuance" value={`${fmtCompact(planckToNum(activeIssuance, chain.decimals))} ${chain.symbol}`} />
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
                    {treasury}
                    {bountyFilter}
                    {bounties && <BountyTable rows={bounties.rows} chain={chain} />}
                    {trackList}
                </div>
                <Pager page={page} pageCount={Math.max(1, Math.ceil(pageTotal / PAGE))} href={n => `${facetHref('', '')}&page=${n}`} />
            </div>
        </div>
    )
}
