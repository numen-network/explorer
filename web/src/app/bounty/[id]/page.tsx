import {notFound} from 'next/navigation'
import AccountLink from '@/components/AccountLink'
import {TabPanels, type Panel} from '@/components/Tabs'
import {DetailCard, DetailRow} from '@/components/Detail'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {bountyStatusLabel, bountyStatusTone} from '@/components/bounties'
import Timeline, {CROSS, RING, TICK, rawSteps, sentenceCase} from '@/components/timeline'
import {chainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {blockTimes, bountyDetail, type AccountRef} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

// the rail marks how a bounty ended, everything before that is a step along
const STEP_TONE = (status: string): 'pos' | 'neg' | 'accent' | 'idle' =>
    status === 'claimed' ? 'pos' : /rejected|cancelled|unassigned/.test(status) ? 'neg' : status === 'awarded' ? 'accent' : 'idle'

const STEP_ICON = (status: string) => (status === 'claimed' ? TICK : /rejected|cancelled|unassigned/.test(status) ? CROSS : RING)

export async function generateMetadata(props: PageProps<'/bounty/[id]'>) {
    const {id} = await props.params
    return {title: `Bounty #${id}`}
}

export default async function BountyPage(props: PageProps<'/bounty/[id]'>) {
    const {id} = await props.params
    const tab = String((await props.searchParams).tab ?? '')
    if (!/^\d+$/.test(id)) notFound()
    const [chain, data] = await Promise.all([chainProps(), bountyDetail(Number(id))])
    const b = data.bounties[0]
    if (!b) notFound()

    const trail = rawSteps(b.timeline)
    const stamps = new Map((await blockTimes([...new Set(trail.map(s => s.block))])).blocks.map(bl => [bl.height, bl.timestamp]))

    const acc = (a: AccountRef | null) => (a ? <AccountLink addr={ss58Encode(a.id, chain.ss58)} acc={a} /> : <span className="text-faint">—</span>)

    const children = (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(24ch,1fr)_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Child bounty</th>
                        <th className="text-right">Value</th>
                        <th>Curator</th>
                        <th>Beneficiary</th>
                        <th className="text-right">Status</th>
                    </tr>
                </thead>
                <tbody>
                    {data.childBounties.map(c => (
                        <tr key={c.id}>
                            <td className="font-mono text-sub">{c.childIndex}</td>
                            <td>
                                <span className="block truncate" title={c.description ?? undefined}>
                                    {c.description ?? `Child #${c.childIndex}`}
                                </span>
                            </td>
                            <td className="text-right font-mono">{fmtBalance(c.value, chain.decimals, chain.symbol)}</td>
                            <td>{acc(c.curator)}</td>
                            <td>{acc(c.beneficiary)}</td>
                            <td className="text-right">
                                <Tag text={bountyStatusLabel(c.status)} tone={bountyStatusTone(c.status)} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )

    const overview = (
        <DetailCard>
            <DetailRow label="Value">{fmtBalance(b.value, chain.decimals, chain.symbol)}</DetailRow>
            {b.fee != null && <DetailRow label="Curator fee">{fmtBalance(b.fee, chain.decimals, chain.symbol)}</DetailRow>}
            {b.payout != null && <DetailRow label="Payout">{fmtBalance(b.payout, chain.decimals, chain.symbol)}</DetailRow>}
            <DetailRow label="Proposer">{acc(b.proposer)}</DetailRow>
            {b.curator && <DetailRow label="Curator">{acc(b.curator)}</DetailRow>}
            {b.beneficiary && <DetailRow label="Beneficiary">{acc(b.beneficiary)}</DetailRow>}
            {b.updateDue != null && (
                <DetailRow label="Curator update due">
                    <BlockLink height={b.updateDue} />
                </DetailRow>
            )}
            {b.unlockAt != null && (
                <DetailRow label="Payout unlocks at">
                    <BlockLink height={b.unlockAt} />
                </DetailRow>
            )}
            <DetailRow label="Proposed at">
                <BlockLink height={b.createdAt} />
            </DetailRow>
        </DetailCard>
    )

    const timeline = (
        <Timeline
            steps={trail.map(s => ({
                block: s.block,
                label: sentenceCase(s.status),
                iso: stamps.get(s.block),
                tone: STEP_TONE(s.status),
                icon: STEP_ICON(s.status),
            }))}
        />
    )

    return (
        <div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-semibold">Bounty #{b.index}</h1>
                <Tag text={bountyStatusLabel(b.status)} tone={bountyStatusTone(b.status)} />
            </div>
            {b.description && <p className="mt-1.5 max-w-3xl text-sm text-sub">{b.description}</p>}

            <div className="mt-4">{overview}</div>

            <TabPanels
                at={tab}
                href={s => `/bounty/${b.index}?tab=${s}`}
                panels={[
                    {slug: 'timeline', label: 'Timeline', count: trail.length, body: () => timeline},
                    ...(data.childBounties.length > 0 ? ([{slug: 'children', label: 'Child bounties', count: data.childBounties.length, body: () => children}] as Panel[]) : []),
                ]}
            />
        </div>
    )
}
