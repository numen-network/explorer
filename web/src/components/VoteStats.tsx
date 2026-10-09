import type {ReactNode} from 'react'
import EmptyList from '@/components/EmptyList'
import {RingChart, StackChart} from '@/components/charts'
import {Card} from '@/components/ui/card'
import {Separator} from '@/components/ui/separator'
import {fmtApprox, fmtCompact, fmtInt, fmtPct} from '@/lib/format'
import type {BallotDelegation, BallotVote, VoteList} from '@/lib/gql'
import {ballotsOf, rangeOf, VOTE_JOINTS, type Ballot} from '@/lib/voteStats'

const LISTS: [VoteList, string][] = [
    ['aye', 'Aye'],
    ['nay', 'Nay'],
    ['abstain', 'Abstain'],
    ['split', 'Split'],
]

// a token colour mixed into white, solid so grid lines stay behind the bars
const tint = (hex: string, share: number) => `#${[1, 3, 5].map(i => Math.round(255 - (255 - parseInt(hex.slice(i, i + 2), 16)) * share).toString(16).padStart(2, '0')).join('')}`

// --good, --destructive, --dim and --warn at 40%
const LIST_COLOR: Record<VoteList, string> = {aye: tint('#4caf50', 0.4), nay: tint('#f44336', 0.4), abstain: tint('#aab0bb', 0.4), split: tint('#ef930b', 0.4)}

// None through Locked6x, each a deeper shade of --primary
const LEVELS = [0, 1, 2, 3, 4, 5, 6]
const LEVEL_COLOR = [0.16, 0.28, 0.4, 0.53, 0.67, 0.83, 1].map(share => tint('#0891b2', share))

interface Group {
    label: string
    has: (b: Ballot) => boolean
}

const WAYS: Group[] = [
    {label: 'Delegated', has: b => b.delegated},
    {label: 'Direct', has: b => !b.delegated},
]

// what a bar measures over the accounts it stands for, its height, the
// tooltip value and the total on top
interface Measure {
    value: (bs: Ballot[]) => number
    tip: (bs: Ballot[]) => string
    total: (bs: Ballot[]) => string
}

const ACCOUNTS: Measure = {value: bs => bs.length, tip: bs => fmtInt(bs.length), total: bs => fmtInt(bs.length)}

function amount(pick: (b: Ballot) => bigint, decimals: number, symbol: string): Measure {
    const sum = (bs: Ballot[]) => bs.reduce((n, b) => n + pick(b), 0n)
    return {value: bs => Number(sum(bs)) / 10 ** decimals, tip: bs => fmtApprox(sum(bs), decimals, symbol), total: bs => fmtApprox(sum(bs), decimals)}
}

// one stack per group, one series per list
function Bars({ballots, lists, groups, measure, ...chart}: {ballots: Ballot[]; lists: [VoteList, string][]; groups: Group[]; measure: Measure; axis?: boolean; height?: number}) {
    const series = lists.map(([list, name]) => {
        const cells = groups.map(g => ballots.filter(b => b.list === list && g.has(b)))
        return {name, color: LIST_COLOR[list], values: cells.map(measure.value), tips: cells.map(measure.tip)}
    })
    return <StackChart labels={groups.map(g => g.label)} series={series} totals={groups.map(g => measure.total(ballots.filter(g.has)))} {...chart} />
}

function Swatch({color}: {color: string}) {
    return <span className="inline-block size-2.5 shrink-0 rounded-[2px]" style={{background: color}} />
}

function Total({label, value, children}: {label: string; value: string; children: ReactNode}) {
    return (
        <div className="min-w-0">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-[17px] leading-7 font-semibold tracking-tight">{value}</div>
            <Separator className="mt-3 mb-2" />
            {children}
        </div>
    )
}

function Heading({note}: {note: string}) {
    return (
        <h3 className="text-[13px] font-semibold">
            Accounts <span className="ml-1 font-normal text-muted-foreground">{note}</span>
        </h3>
    )
}

interface Props {
    votes: BallotVote[]
    delegations: BallotDelegation[]
    decimals: number
    symbol: string
}

/** Who voted which way and with how much, every delegator an account of its own. */
export default function VoteStats({votes, delegations, decimals, symbol}: Props) {
    const ballots = ballotsOf(votes, delegations)
    if (ballots.length === 0) {
        return (
            <Card size="flush">
                <EmptyList what="votes" />
            </Card>
        )
    }
    // split votes are rare, they only earn a colour when the referendum has any
    const lists = LISTS.filter(([list]) => list !== 'split' || ballots.some(b => b.list === 'split'))
    const sum = (pick: (b: Ballot) => bigint) => ballots.reduce((n, b) => n + pick(b), 0n)
    const levels: Group[] = LEVELS.map(n => ({label: `${n}x`, has: b => b.level === n}))
    const ranges: Group[] = [...VOTE_JOINTS, null].map((joint, i) => ({
        label: joint == null ? `>${fmtCompact(VOTE_JOINTS[i - 1])}` : `${i === 0 ? '0' : fmtCompact(VOTE_JOINTS[i - 1])}-${fmtCompact(joint)}`,
        has: b => rangeOf(b.votes, decimals) === i,
    }))
    const atLevel = LEVELS.map(n => ballots.filter(b => b.level === n).length)
    return (
        <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
                <h2 className="text-[15px] font-semibold">Statistics</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {lists.map(([list, name]) => (
                        <span key={list} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Swatch color={LIST_COLOR[list]} />
                            {name}
                        </span>
                    ))}
                </div>
            </div>
            <Card size="flush" className="@container gap-0 divide-y">
                <section className="grid grid-cols-[minmax(0,1fr)] gap-x-10 gap-y-6 px-5 py-4 @xl:grid-cols-3">
                    <Total label="Accounts" value={fmtInt(ballots.length)}>
                        <Bars ballots={ballots} lists={lists} groups={WAYS} measure={ACCOUNTS} />
                    </Total>
                    <Total label="Capital" value={fmtApprox(sum(b => b.capital), decimals, symbol)}>
                        <Bars ballots={ballots} lists={lists} groups={WAYS} measure={amount(b => b.capital, decimals, symbol)} />
                    </Total>
                    <Total label="Votes" value={fmtApprox(sum(b => b.votes), decimals, symbol)}>
                        <Bars ballots={ballots} lists={lists} groups={WAYS} measure={amount(b => b.votes, decimals, symbol)} />
                    </Total>
                </section>
                <section className="px-5 py-4">
                    <Heading note="by conviction" />
                    <div className="mt-2 flex flex-col gap-x-10 gap-y-5 @2xl:flex-row @2xl:items-center">
                        <div className="min-w-0 flex-1">
                            <Bars ballots={ballots} lists={lists} groups={levels} measure={ACCOUNTS} height={184} />
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-center gap-x-8 gap-y-5">
                            <ul aria-label="Conviction shares" className="grid grid-cols-[auto_auto_auto] items-center gap-x-3 gap-y-1.5 text-xs">
                                {LEVELS.map(n => (
                                    <li key={n} className="col-span-3 grid grid-cols-subgrid items-center">
                                        <Swatch color={LEVEL_COLOR[n]} />
                                        <span>{n}x</span>
                                        <span className="text-right text-muted-foreground tabular-nums">{fmtPct(atLevel[n], ballots.length)}</span>
                                    </li>
                                ))}
                            </ul>
                            <RingChart
                                total={fmtInt(ballots.length)}
                                unit="Accounts"
                                slices={LEVELS.map(n => ({label: `${n}x`, value: atLevel[n], color: LEVEL_COLOR[n], tip: `${fmtInt(atLevel[n])} · ${fmtPct(atLevel[n], ballots.length)}`}))}
                            />
                        </div>
                    </div>
                </section>
                <section className="px-5 py-4">
                    <Heading note="by votes" />
                    <div className="mt-3">
                        <Bars ballots={ballots} lists={lists} groups={ranges} measure={ACCOUNTS} axis height={184} />
                    </div>
                </section>
            </Card>
        </div>
    )
}
