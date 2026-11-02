import type {ReactNode} from 'react'
import {shortAddr} from '@/components/AddressText'
import Approx from '@/components/Approx'
import {GridSwatch, VoteGrid} from '@/components/charts'
import {Card} from '@/components/ui/card'
import {chainDbHead, type ChainProps} from '@/lib/chain'
import {convictionLabel, decisionOf, levelLabel, voteParts, type Decision} from '@/lib/conviction'
import {fmtBalance, fmtInt, fmtSpan, sentenceCase, trackLabel} from '@/lib/format'
import {delegationsCountedBy, voteGrid, type VoteRow} from '@/lib/gql'
import {identityLabel} from '@/lib/identity'
import {PHASE_LABEL, phaseOf} from '@/lib/referendum'
import {ss58Encode} from '@/lib/ss58'
import {delegationTotals} from '@/lib/voteEntry'
import {GRID_LEGEND, type FactGroup, type GridCell} from '@/lib/voteGrid'

const voteLabel = (vote: Decision | null) => GRID_LEGEND[0].items.find(l => l.vote === vote)!.label

type Fact = [string, ReactNode]

const block = (height: number) => `#${fmtInt(height)}`

// one square per referendum, coloured by how the account voted on it, hollow
// where its delegation voted for it
export default async function VoteRecord({hex, chain}: {hex: string; chain: ChainProps}) {
    const [{referenda, votes, delegated}, head] = await Promise.all([voteGrid(hex), chainDbHead()])
    const counted = await delegationsCountedBy(hex, votes.filter(v => v.kind === 'Standard').map(v => v.referendum.index))
    const amount = (planck: bigint | string) => fmtBalance(planck, chain.decimals, chain.symbol)
    const weight = (planck: string) => <Approx planck={planck} decimals={chain.decimals} symbol={chain.symbol} />
    const unlocks = (v: VoteRow): Fact[] => {
        if (v.lockedUntil == null) return []
        const state = v.unlockedAt != null ? 'Unlocked' : v.lockedUntil > head.height ? `in ${fmtSpan((v.lockedUntil - head.height) * chain.blockTime)}` : 'Unlockable'
        return [['Unlocks', `${block(v.unlockedAt ?? v.lockedUntil)} · ${state}`]]
    }
    const delegations = (index: number): FactGroup[] => {
        const t = delegationTotals(counted.get(index) ?? [])
        return t.delegatorCount === 0 ? [] : [{label: 'Received votes', rows: [['Votes', weight(t.delegatedVotes)], ['Delegators', fmtInt(t.delegatorCount)], ['Capital', weight(t.delegatedCapital)]]}]
    }
    const cast = new Map<number, Pick<GridCell, 'vote' | 'delegated'> & {rows: Fact[]; more: FactGroup[]}>()
    for (const v of votes) {
        const parts = voteParts(v)
        const capital: Fact[] = v.kind === 'Standard' ? [['Capital', amount(parts[0].capital)]] : parts.map(p => [sentenceCase(p.side), amount(p.capital)])
        const conviction = v.kind === 'Standard' ? convictionLabel(v.conviction) : levelLabel(0)
        cast.set(v.referendum.index, {
            vote: decisionOf(v),
            delegated: false,
            rows: [['Vote', voteLabel(decisionOf(v))], ['Conviction', conviction], ...capital, ['Votes', weight(v.votes)], ['Block', block(v.block)], ...unlocks(v)],
            more: delegations(v.referendum.index),
        })
    }
    for (const d of delegated) {
        const vote = d.aye ? 'aye' : 'nay'
        cast.set(d.referendum.index, {
            vote,
            delegated: true,
            rows: [
                ['Vote', voteLabel(vote)],
                ['Delegate', identityLabel(d.voter) ?? shortAddr(ss58Encode(d.voter.id, chain.ss58))],
                ['Conviction', convictionLabel(d.conviction)],
                ['Capital', amount(d.balance)],
                ['Votes', weight(d.votes)],
                ['Block', block(d.block)],
            ],
            more: [],
        })
    }
    const cells: GridCell[] = referenda.map(r => {
        const {vote, delegated, rows, more} = cast.get(r.index) ?? {vote: null, delegated: false, rows: [['Vote', voteLabel(null)]], more: []}
        return {index: r.index, title: r.title, vote, delegated, facts: [{label: null, rows: [['Track', trackLabel(r.track.name)], ['Status', PHASE_LABEL[phaseOf(r)]], ...rows]}, ...more]}
    })
    return (
        // the tooltip runs taller than the grid and hangs past the card
        <Card className="mb-3 gap-3 overflow-visible px-5 py-4">
            <VoteGrid cells={cells} />
            <div role="group" aria-label="Vote record legend" className="mx-auto grid w-fit gap-y-1.5 text-xs text-muted-foreground">
                {GRID_LEGEND.map(g => (
                    <div key={g.label} className="flex gap-x-4">
                        <span className="w-16 shrink-0 text-right">{g.label}</span>
                        <ul aria-label={g.label} className="flex flex-wrap gap-x-4 gap-y-1.5">
                            {g.items.map(l => (
                                <li key={l.label} className="flex items-center gap-2">
                                    <GridSwatch vote={l.vote} delegated={l.delegated} />
                                    {l.label}
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>
        </Card>
    )
}
