import Link from 'next/link'
import {FileText} from 'lucide-react'
import {qualified} from '@/components/calls'
import {describePreimage} from '@/lib/args'
import {markArgs} from '@/lib/argMarks'
import {PARTICIPATION_DAYS, participationFrom} from '@/components/account/shared'
import Approx from '@/components/Approx'
import EmptyList from '@/components/EmptyList'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {TabNav} from '@/components/Tabs'
import {Tip} from '@/components/Tip'
import {FilterSelect} from '@/components/pills'
import {ThresholdChart} from '@/components/charts'
import {ReferendumByline, ThresholdBar} from '@/components/referenda'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {chainDbHead, chainProps, windowStart} from '@/lib/chain'
import {fmtCount, fmtInt, shortHash, trackLabel, truncFixed} from '@/lib/format'
import type {Curve} from '@/lib/curves'
import {activeIssuanceOf, needsNow} from '@/lib/referendum'
import {delegatesPage, firstBlockSince, governanceSummary, preimagesPage, referendaPage, specVersionAt, tracksPage, treasurySpendsPage, votersPage} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {loadRuntimes} from '@/lib/runtime'
import {SPEND_KIND_LABEL, SPEND_STATES} from '@/lib/spends'
import {DelegatesTable, PreimagesTable, TracksTable, TreasuryTable, VotersTable} from './tables'
import {withHeads} from '@/components/withHeads'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Governance'}

const TABS = ['referenda', 'treasury', 'tracks', 'voters', 'delegates', 'preimages'] as const
type Tab = (typeof TABS)[number]

// the Treasury call families and the Treasury events a spend can end on
const SPEND_KINDS = ['spend_local', 'spend']

async function preimageViews(limit: number, offset: number) {
    const rows = await preimagesPage(limit, offset)
    const views = await Promise.all(
        rows.map(async ({bytes, calls, ...p}) => {
            const view = bytes ? describePreimage(p.id, bytes, await specVersionAt(p.notedBlock!)) : null
            const body = view?.kind === 'fields' ? view.fields[0][1] : null
            return {...p, call: calls?.[0] ? qualified(calls[0]) : null, raw: p.kind === 'Raw' && bytes ? shortHash(bytes) : null, view, text: body?.kind === 'hex' && body.text ? {text: body.text.text, full: body.text.full} : null, download: bytes ? `/api/bytes?preimage=${p.id}&hash=${p.hash}` : null}
        })
    )
    await markArgs(views.map(p => p.view))
    return views
}

async function GovernancePage(props: PageProps<'/governance'>) {
    await loadRuntimes()
    const sp = await props.searchParams
    const tab = (TABS as readonly string[]).includes(String(sp.tab)) ? (String(sp.tab) as Tab) : 'referenda'
    const pg = paging(sp)
    const [chain, head, sum] = await Promise.all([chainProps(), chainDbHead(), governanceSummary()])
    const trackIds = sum.trackList.map(t => t.id)
    const chosen = (v: unknown, values: string[]) => (values.includes(String(v)) ? String(v) : '')
    const track = chosen(sp.track, trackIds)
    const kind = chosen(sp.kind, SPEND_KINDS)
    const status = chosen(sp.status, [...SPEND_STATES])
    const on = {kind, status, track}

    const [refs, spends, tracks, voters, delegates, preimages] = await Promise.all([
        tab === 'referenda' ? referendaPage(pg.size, pg.offset, track || undefined) : null,
        tab === 'treasury' ? treasurySpendsPage(pg.size, pg.offset, {kind: SPEND_KINDS, status: [...SPEND_STATES], track: trackIds}, on, head.height) : null,
        tab === 'tracks' ? tracksPage(pg.size, pg.offset) : null,
        tab === 'voters' ? firstBlockSince(windowStart(head, PARTICIPATION_DAYS)).then(windowBlock => votersPage(pg.size, pg.offset, first => participationFrom(first, windowBlock))) : null,
        tab === 'delegates' ? delegatesPage(pg.size, pg.offset) : null,
        tab === 'preimages' ? preimageViews(pg.size, pg.offset) : null,
    ])

    const latest = sum.dailyStats[0]
    const activeIssuance = latest ? BigInt(latest.issuanceTotal) - BigInt(latest.issuanceInactive) : 0n
    const pageTotal = {referenda: refs?.conn.totalCount ?? 0, treasury: spends?.total ?? 0, tracks: sum.tracks.totalCount, voters: sum.voters.totalCount, delegates: sum.delegates.totalCount, preimages: sum.preimages.totalCount}[tab]

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
            <FacetRow label="Status" field="status" values={[...SPEND_STATES]} counts={spends.counts.status} labelOf={v => v} />
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
                const need = needsNow(r, head.height)
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
                                        {r.proposalPayouts != null && r.proposalPayouts > 1 && <span className="text-muted-foreground"> · {fmtCount(r.proposalPayouts, 'payout')}</span>}
                                    </>
                                ) : (
                                    <span className="text-muted-foreground">{r.proposalMethod ?? ''}</span>
                                )}
                            </span>
                        </div>
                        <Separator className="my-3" />
                        <ReferendumByline r={r} chain={chain} />
                        {need && (
                            <div className="mt-4 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-3 sm:grid-cols-2">
                                <ThresholdBar
                                    label="Approval"
                                    variant="split"
                                    part={ayes}
                                    whole={ayes + nays}
                                    need={need.approval}
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
                                    whole={activeIssuanceOf(r)}
                                    need={need.support}
                                    foot={
                                        <>
                                            <span>voted <Approx planck={r.support} decimals={chain.decimals} /></span>
                                            <span>of <Approx planck={activeIssuanceOf(r)} decimals={chain.decimals} /></span>
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
                <TabNav
                    aria-label="Governance"
                    items={[
                        {label: 'Referenda', count: sum.refs.totalCount, href: '/governance?tab=referenda', active: tab === 'referenda'},
                        {label: 'Treasury spends', count: sum.spends.totalCount, href: '/governance?tab=treasury', active: tab === 'treasury'},
                        {label: 'Tracks', count: sum.tracks.totalCount, href: '/governance?tab=tracks', active: tab === 'tracks'},
                        {label: 'Voters', count: sum.voters.totalCount, href: '/governance?tab=voters', active: tab === 'voters'},
                        {label: 'Delegates', count: sum.delegates.totalCount, href: '/governance?tab=delegates', active: tab === 'delegates'},
                        {label: 'Preimages', count: sum.preimages.totalCount, href: '/governance?tab=preimages', active: tab === 'preimages'},
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
                    {voters && (
                        <Card size="flush">
                            <VotersTable rows={voters} chain={chain} />
                        </Card>
                    )}
                    {delegates && (
                        <Card size="flush">
                            <DelegatesTable rows={delegates} chain={chain} referenda={sum.refs.totalCount} />
                        </Card>
                    )}
                    {preimages && (
                        <Card size="flush">
                            <PreimagesTable rows={preimages} chain={chain} />
                        </Card>
                    )}
                </div>
                <Pager paging={pg} total={pageTotal} href={facetHref('', '')} />
            </div>
        </div>
    )
}

export default withHeads(GovernancePage)
