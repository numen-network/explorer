import {cn} from 'cn'
import type {ReactNode} from 'react'
import Approx from '@/components/Approx'
import {Card} from '@/components/ui/card'
import {chainDbHead, type ChainProps} from '@/lib/chain'
import {fmtInt, fmtPct} from '@/lib/format'
import {participation, type AccountRow} from '@/lib/gql'
import {PARTICIPATION_DAYS, participationFrom} from './shared'

export type Voting = Pick<AccountRow, 'firstSeenBlock' | 'ownVotes' | 'receivedVotes' | 'delegatedVotes' | 'directReferenda' | 'delegatedReferenda'>

interface Part {
    label: string
    tone: string
    weight: bigint
    value: ReactNode
    share?: string
    // sits flush against the part before it in the bar
    joined?: boolean
}

function Bar({parts, rest}: {parts: Part[]; rest: bigint}) {
    const shown = [...parts, {label: 'Rest', tone: 'bg-border', weight: rest, value: null}].filter(p => p.weight > 0n)
    return (
        <div className={cn('mt-2.5 flex h-2 overflow-hidden rounded-full', shown.length === 0 && 'bg-border')}>
            {shown.map((p, i) => (
                <i key={p.label} className={cn('block min-w-1 basis-0', p.tone, i > 0 && !p.joined && 'ml-[3px]')} style={{flexGrow: Number(p.weight)}} />
            ))}
        </div>
    )
}

function Column({label, total, parts, rest = 0n}: {label: string; total: ReactNode; parts: Part[]; rest?: bigint}) {
    const shares = parts.some(p => p.share !== undefined)
    return (
        <section aria-label={label} className="min-w-0 content-start not-first:mt-3.5 not-first:border-t not-first:pt-3.5 sm:row-span-4 sm:grid sm:grid-rows-subgrid sm:not-first:mt-0 sm:not-first:border-t-0 sm:not-first:pt-0">
            <h3 className="text-xs text-muted-foreground">{label}</h3>
            <p className="mt-1.5 text-[17px] leading-7 font-semibold tracking-tight wrap-anywhere sm:text-[19px]">{total}</p>
            <Bar parts={parts} rest={rest} />
            <dl className={cn('mt-3 grid content-start items-baseline gap-x-3 gap-y-1.5 text-sm', shares ? 'grid-cols-[auto_1fr_auto]' : 'grid-cols-[auto_1fr]')}>
                {parts.map(p => (
                    <div key={p.label} className="contents">
                        <dt className="flex items-baseline gap-2 whitespace-nowrap text-muted-foreground">
                            <span className={cn('size-2 shrink-0 self-center rounded-full', p.tone)} />
                            {p.label}
                        </dt>
                        <dd className="text-right tabular-nums">{p.value}</dd>
                        {shares && <dd className="min-w-14 text-right text-xs text-muted-foreground tabular-nums">{p.share}</dd>}
                    </div>
                ))}
            </dl>
        </section>
    )
}

// the referenda the account voted on, its share of the window's referenda,
// and its voting power by role
export default async function VotingTile({hex, chain, voting}: {hex: string; chain: ChainProps; voting: Voting}) {
    const head = await chainDbHead()
    const sum = await participation(hex, participationFrom(voting.firstSeenBlock, head.height, chain.blockTime))
    const amount = (planck: bigint) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} breakable />
    const [own, received, delegated] = [voting.ownVotes, voting.receivedVotes, voting.delegatedVotes].map(BigInt)
    const votes = own + received + delegated
    const {directReferenda: direct, delegatedReferenda: delegatedOn} = voting
    const [directVoted, delegatedVoted, open] = [sum.directVoted, sum.delegatedVoted, sum.open].map(c => c.totalCount)
    const referenda = direct + delegatedOn
    const rate = (voted: number) => (open > 0 ? fmtPct(voted, open) : '—')
    return (
        <Card className="mb-3 gap-1 py-3.5 sm:py-4 sm:[--card-spacing:--spacing(5)]">
            <div className="px-(--card-spacing) sm:grid sm:grid-cols-3 sm:grid-rows-[repeat(4,auto)] sm:gap-x-10">
                <Column
                    label="Referenda"
                    total={fmtInt(referenda)}
                    parts={[
                        {label: 'Direct', tone: 'bg-primary', weight: BigInt(direct), value: fmtInt(direct), share: fmtPct(direct, referenda)},
                        {label: 'Delegated', tone: 'bg-delegated', weight: BigInt(delegatedOn), value: fmtInt(delegatedOn), share: fmtPct(delegatedOn, referenda)},
                    ]}
                />
                <Column
                    label={`Participation (${PARTICIPATION_DAYS}d)`}
                    total={rate(directVoted + delegatedVoted)}
                    parts={[
                        {label: 'Direct', tone: 'bg-primary', weight: BigInt(directVoted), value: rate(directVoted)},
                        {label: 'Delegated', tone: 'bg-delegated', weight: BigInt(delegatedVoted), value: rate(delegatedVoted)},
                    ]}
                    rest={BigInt(open - directVoted - delegatedVoted)}
                />
                <Column
                    label="Votes"
                    total={amount(votes)}
                    parts={[
                        {label: 'Direct', tone: 'bg-primary', weight: own, value: amount(own), share: fmtPct(own, votes)},
                        {label: 'Received', tone: 'bg-delegate', weight: received, value: amount(received), share: fmtPct(received, votes), joined: true},
                        {label: 'Delegated', tone: 'bg-delegated', weight: delegated, value: amount(delegated), share: fmtPct(delegated, votes)},
                    ]}
                />
            </div>
        </Card>
    )
}
