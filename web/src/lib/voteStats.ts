import {capitalOf, convictionLevel, decisionOf, votesOf, weigh} from '@/lib/conviction'
import type {BallotDelegation, BallotVote, VoteList} from '@/lib/gql'

/** One account's part in a referendum, a vote of its own or a delegation riding one. */
export interface Ballot {
    list: VoteList
    delegated: boolean
    capital: bigint
    votes: bigint
    level: number
}

// a delegation takes the side of the standard vote that carries it
export function ballotsOf(votes: BallotVote[], delegations: BallotDelegation[]): Ballot[] {
    const side = new Map<string, VoteList>(votes.filter(v => v.kind === 'Standard').map(v => [v.voter.id, decisionOf(v)]))
    return [
        ...votes.map((v): Ballot => ({list: decisionOf(v), delegated: false, capital: capitalOf(v), votes: votesOf(v), level: convictionLevel(v.conviction)})),
        ...delegations.map((d): Ballot => {
            const list = side.get(d.voter.id)
            if (list == null) throw new Error(`a delegation counts through ${d.voter.id}, who holds no standard vote`)
            return {list, delegated: true, capital: BigInt(d.balance), votes: weigh(d.balance, d.conviction), level: convictionLevel(d.conviction)}
        }),
    ]
}

// the ranges Subsquare sorts Polkadot accounts into by votes, in whole tokens,
// each one holding the votes up to its joint and a last one past them all
export const VOTE_JOINTS = [10_000n, 500_000n, 1_000_000n, 5_000_000n]

export function rangeOf(votes: bigint, decimals: number): number {
    const i = VOTE_JOINTS.findIndex(joint => votes <= joint * 10n ** BigInt(decimals))
    return i === -1 ? VOTE_JOINTS.length : i
}
