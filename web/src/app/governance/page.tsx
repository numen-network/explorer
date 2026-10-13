import Link from 'next/link'
import {FileText} from 'lucide-react'
import Approx from '@/components/Approx'
import EmptyList from '@/components/EmptyList'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabBar} from '@/components/Tabs'
import {Tip} from '@/components/Tip'
import {FilterSelect} from '@/components/pills'
import {ThresholdChart} from '@/components/charts'
import {payouts, ReferendumByline, ThresholdBar} from '@/components/referenda'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {curveAt, type Curve} from '@/lib/curves'
import {chainDbHead, chainProps} from '@/lib/chain'
import {camelLabel, fmtCount, fmtInt, trackLabel, truncFixed} from '@/lib/format'
import {isLive, phaseFraction} from '@/lib/referendum'
import {delegatesPage, governanceSummary, referendaPage, tracksPage, treasurySpendsPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {DelegatesTable, TracksTable, TreasuryTable} from './tables'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Governance'}

const TABS = ['referenda', 'treasury', 'tracks', 'delegates'] as const
type Tab = (typeof TABS)[number]

// the Treasury call families and the Treasury events a spend can end on
const SPEND_KINDS = ['spend_local', 'spend']
const SPEND_STATUSES = ['SpendApproved', 'Awarded', 'AssetSpendApproved', 'Paid', 'AssetSpendVoided', 'PaymentFailed', 'SpendProcessed']
const SPEND_KIND_LABEL: Record<string, string> = {spend_local: 'Local', spend: 'Spend'}

export default async function GovernancePage(props: PageProps<'/governance'>) {
    const sp = await props.searchParams
    const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as Tab) : 'referenda'
    const pg = paging(sp)
    const [chain, head, sum] = await Promise.all([chainProps(), chainDbHead(), governanceSummary()])
    const trackIds = sum.trackList.map(t => t.id)
    const chosen = (v: unknown, values: string[]) => (values.includes(String(v)) ? String(v) : '')
    const track = chosen(sp.track, trackIds)
    const kind = chosen(sp.kind, SPEND_KINDS)
    const status = chosen(sp.status, SPEND_STATUSES)
    const on = {kind, status, track}

    const [refs, spends, tracks, delegates] = await Promise.all([
        tab === 'referenda' ? referendaPage(pg.size, pg.offset, track || undefined) : null,
        tab === 'treasury' ? treasurySpendsPage(pg.size, pg.offset, {kind: SPEND_KINDS, status: SPEND_STATUSES, track: trackIds}, on) : null,
        tab === 'tracks' ? tracksPage(pg.size, pg.offset) : null,
        tab === 'delegates' ? delegatesPage(pg.size, pg.offset) : null,
    ])

    const latest = sum.dailyStats[0]
    const activeIssuance = latest ? BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive) : 0n
    const pageTotal = {referenda: refs?.conn.totalCount ?? 0, treasury: spends?.total ?? 0, tracks: sum.tracks.totalCount, delegates: sum.delegates.totalCount}[tab]

    // a pick keeps the other dimensions and drops paging
    const facetHref = (field: string, value: string) => {
        const next: Record<string, string> = {tab, ...on, ...(field ? {[field]: value} : {})}
        return `/governance?${Object.entries(next).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&')}`
    }
    const FacetRow = ({label, field, values, counts, labelOf}: {label: string; field: keyof typeof on; values: string[]; counts: Record<string, number>; labelOf: (v: string) => string}) => (
        <FilterSelect label={label} labelClassName="w-12" values={values} counts={counts} labelOf={labelOf} value={on[field]} href={v => facetHref(field, v)} />
    )
    const trackName = (id: string) => trackLabel(sum.trackList.find(t => t.id === id)?.name ?? id)

    const spendFilter = spends && spends.all > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <FacetRow label="Kind" field="kind" values={SPEND_KINDS} counts={spends.counts.kind} labelOf={v => SPEND_KIND_LABEL[v]} />
            <FacetRow label="Status" field="status" values={SPEND_STATUSES} counts={spends.counts.status} labelOf={camelLabel} />
            <FacetRow label="Track" field="track" values={trackIds} counts={spends.counts.track} labelOf={trackName} />
        </div>
    )

    const trackFilter = refs && (
        <FilterSelect label="Track" className="mb-4" values={trackIds} labelOf={trackName} value={track} href={v => (v ? `/governance?tab=referenda&track=${v}` : '/governance?tab=referenda')} />
    )

    const referenda = refs && (
        <div className="space-y-3">
            {refs.referendums.length === 0 && (
                <Card size="flush">
                    <EmptyList what="referenda" filtered={!!track} />
                </Card>
            )}
            {refs.referendums.map(r => {
                const ayes = BigInt(r.ayes)
                const nays = BigInt(r.nays)
                const ran = isLive(r) ? phaseFraction(r.decidingSince, r.track.decisionPeriod, head.height) : null
                const at = ran !== null ? Math.min(1, Math.max(0, ran)) : null
                const title = r.title ?? `[${trackLabel(r.track.name)}] Referendum #${r.index}`
                return (
                    <Card key={r.id} size="flush" className="px-7 py-5">
                        <div className="flex items-baseline gap-x-6 gap-y-1 max-sm:flex-wrap">
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
                            <span className="ml-auto shrink-0 text-sm">
                                {r.proposalAmount != null ? (
                                    <>
                                        <span className="font-semibold">{fmtInt(truncFixed(r.proposalAmount, 0, chain.decimals))}</span>{' '}
                                        <span className="font-medium text-dim">{chain.symbol}</span>
                                        {payouts(r.proposalCalls) > 1 && <span className="text-muted-foreground"> · {fmtCount(payouts(r.proposalCalls), 'payout')}</span>}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">{r.proposalMethod ?? ''}</span>
                                )}
                            </span>
                        </div>
                        <Separator className="my-3" />
                        <ReferendumByline r={r} chain={chain} />
                        {at !== null && (
                            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-3 sm:grid-cols-2">
                                <ThresholdBar
                                    label="Approval"
                                    variant="split"
                                    part={ayes}
                                    whole={ayes + nays}
                                    need={curveAt(r.track.minApproval as Curve, at) * 100}
                                    foot={
                                        <>
                                            <span>aye <Approx planck={r.ayes} decimals={chain.decimals} /></span>
                                            <span>nay <Approx planck={r.nays} decimals={chain.decimals} /></span>
                                        </>
                                    }
                                />
                                <ThresholdBar
                                    label="Support"
                                    variant="solid"
                                    part={BigInt(r.support)}
                                    whole={activeIssuance}
                                    need={curveAt(r.track.minSupport as Curve, at) * 100}
                                    foot={
                                        <>
                                            <span>voted <Approx planck={r.support} decimals={chain.decimals} /></span>
                                            <span>of <Approx planck={activeIssuance} decimals={chain.decimals} /></span>
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
                            seconds={t.decisionPeriod * chain.blockTime}
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
                <StatTile label="Treasury pot" value={latest ? <Approx planck={latest.treasuryPot} decimals={chain.decimals} symbol={chain.symbol} breakable /> : '—'} />
                <StatTile label="Active issuance" value={<Approx planck={activeIssuance} decimals={chain.decimals} symbol={chain.symbol} breakable />} />
            </div>

            <div className="mt-7">
                <TabBar
                    aria-label="Governance"
                    items={[
                        {label: 'Referenda', count: sum.refs.totalCount, href: '/governance?tab=referenda', active: tab === 'referenda'},
                        {label: 'Treasury spends', count: sum.spends.totalCount, href: '/governance?tab=treasury', active: tab === 'treasury'},
                        {label: 'Tracks', count: sum.tracks.totalCount, href: '/governance?tab=tracks', active: tab === 'tracks'},
                        {label: 'Delegates', count: sum.delegates.totalCount, href: '/governance?tab=delegates', active: tab === 'delegates'},
                    ]}
                />
                <div className="mt-4">
                    {trackFilter}
                    {referenda}
                    {spendFilter}
                    {spends && (
                        <Card size="flush">
                            <TreasuryTable rows={spends.rows} chain={chain} filtered={spends.all > 0 && !!(kind || status || track)} />
                        </Card>
                    )}
                    {tracks && (
                        <Card size="flush">
                            <TracksTable rows={tracks.tracks} chain={chain} />
                        </Card>
                    )}
                    {trackCurves}
                    {delegates && (
                        <Card size="flush">
                            <DelegatesTable rows={delegates} chain={chain} referenda={sum.refs.totalCount} />
                        </Card>
                    )}
                </div>
                <Pager paging={pg} total={pageTotal} href={facetHref('', '')} />
            </div>
        </div>
    )
}
