import {voteParts, type VoteSide} from './conviction'
import {ONE, perbill, threshold, type Curve} from './curves'
import type {BallotDelegation, BallotVote} from './gql'

export interface Tally {
    ayes: bigint
    nays: bigint
    support: bigint
}

/** The accounts a vote list marks pivotal, with whether the tally passes and is over. */
export interface Pivotal {
    addrs: string[]
    ended: boolean
    passing: boolean
}

interface Part {
    side: VoteSide
    capital: bigint
    votes: bigint
}

const EMPTY: Tally = {ayes: 0n, nays: 0n, support: 0n}

// conviction_voting's Tally::add. Ayes and nays count votes, support counts
// aye and abstain capital
function plus(t: Tally, p: Part): Tally {
    if (p.side === 'aye') return {...t, ayes: t.ayes + p.votes, support: t.support + p.capital}
    if (p.side === 'nay') return {...t, nays: t.nays + p.votes}
    return {...t, support: t.support + p.capital}
}

const minus = (a: Tally, b: Tally): Tally => ({ayes: a.ayes - b.ayes, nays: a.nays - b.nays, support: a.support - b.support})

// what each account takes off the tally when it goes. A voter takes its vote
// and every delegation it carries, a delegator just its delegation
function stakes(votes: BallotVote[], delegations: BallotDelegation[]): Map<string, Tally> {
    const out = new Map(votes.map(v => [v.voter.id, voteParts(v).reduce(plus, EMPTY)]))
    const side = new Map(votes.filter(v => v.kind === 'Standard').map(v => [v.voter.id, v.aye ? 'aye' : 'nay'] as const))
    for (const d of delegations) {
        const part = {side: side.get(d.voter.id)!, capital: BigInt(d.balance), votes: BigInt(d.votes)}
        out.set(d.delegator.id, plus(EMPTY, part))
        out.set(d.voter.id, plus(out.get(d.voter.id)!, part))
    }
    return out
}

interface Curves {
    minApproval: unknown
    minSupport: unknown
}

// pallet_referenda's is_passing once the decision period has run out
function passing(t: Tally, track: Curves, active: bigint): boolean {
    const cast = t.ayes + t.nays
    const approval = cast === 0n ? 0n : perbill(t.ayes, cast)
    return approval >= threshold(track.minApproval as Curve, ONE) && perbill(t.support, active) >= threshold(track.minSupport as Curve, ONE)
}

/** A tally's verdict at the end of its decision period, plus the accounts that alone flip it. */
export function pivotalAccounts(tally: Tally, votes: BallotVote[], delegations: BallotDelegation[], track: Curves, active: bigint): {passing: boolean; ids: string[]} {
    const now = passing(tally, track, active)
    const ids = [...stakes(votes, delegations)].filter(([, stake]) => passing(minus(tally, stake), track, active) !== now).map(([id]) => id)
    return {passing: now, ids}
}
