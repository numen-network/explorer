import {notFound} from 'next/navigation'
import AccountLink from '@/components/AccountLink'
import {TabPanels, type Panel} from '@/components/Tabs'
import {DetailCard, DetailRow, NONE} from '@/components/Detail'
import {BlockLink} from '@/components/links'
import {bountyStatusTone} from '@/components/bounties'
import Timeline, {CROSS, RING, TICK, rawSteps} from '@/components/timeline'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {chainProps} from '@/lib/chain'
import {camelLabel, fmtBalance} from '@/lib/format'
import {bountyDetail, type AccountRef} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {ChildBountiesTable} from './table'

export const dynamic = 'force-dynamic'

// the rail marks how a bounty ended, everything before that is a step along
const STEP_TONE = (name: string): 'pos' | 'neg' | 'primary' | 'idle' =>
    name === 'Bounties.BountyClaimed' ? 'pos' : /Rejected|Canceled|Unassigned/.test(name) ? 'neg' : name === 'Bounties.BountyAwarded' ? 'primary' : 'idle'

const STEP_ICON = (name: string) => (name === 'Bounties.BountyClaimed' ? TICK : /Rejected|Canceled|Unassigned/.test(name) ? CROSS : RING)

// the event names read as what happened to the bounty
const STEP_LABEL: Record<string, string> = {
    'Bounties.BountyProposed': 'Proposed',
    'Bounties.BountyApproved': 'Approved',
    'Bounties.BountyBecameActive': 'Funded',
    'Bounties.CuratorProposed': 'Curator proposed',
    'Bounties.CuratorAccepted': 'Curator accepted',
    'Bounties.CuratorUnassigned': 'Curator unassigned',
    'Bounties.BountyAwarded': 'Awarded',
    'Bounties.BountyClaimed': 'Claimed',
    'Bounties.BountyRejected': 'Rejected',
    'Bounties.BountyCanceled': 'Cancelled',
    'Bounties.BountyExtended': 'Extended',
}

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

    const acc = (a: AccountRef | null) => (a ? <AccountLink addr={ss58Encode(a.id, chain.ss58)} acc={a} /> : NONE)

    const children = (
        <Card size="flush">
            <ChildBountiesTable rows={data.childBounties} chain={chain} />
        </Card>
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
                label: STEP_LABEL[s.name] ?? camelLabel(s.name.split('.')[1]),
                iso: s.timestamp,
                tone: STEP_TONE(s.name),
                icon: STEP_ICON(s.name),
            }))}
        />
    )

    return (
        <div>
            <div className="mt-6 flex flex-wrap items-center gap-3">
                <h1 className="text-lg font-semibold">Bounty #{b.index}</h1>
                <Badge variant={bountyStatusTone(b.status)}>{camelLabel(b.status)}</Badge>
            </div>
            {b.description && <p className="mt-1.5 max-w-3xl text-sm text-muted-foreground">{b.description}</p>}

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
