import type {VoteEntry} from '@/components/votes'
import {capitalOf, convictionLabel, type VoteShape} from './conviction'
import {accountRefs, type AccountRef} from './gql'
import {ss58Encode} from './ss58'

// the panel answers who is behind the vote, the full roster lives on the
// delegate account page
const INLINE_DELEGATORS = 10

export interface CountedDelegation {
    conviction: string
    balance: string
    votes: string
    delegator: {id: string}
}

// the biggest few plus any delegator a search found
function inline(list: CountedDelegation[], found: Set<string>): CountedDelegation[] {
    return list.filter((d, i) => i < INLINE_DELEGATORS || found.has(d.delegator.id))
}

/** Identities of the delegators each vote's panel lists. */
export async function inlineRefs(lists: CountedDelegation[][], found: Set<string>): Promise<Map<string, AccountRef>> {
    const ids = [...new Set(lists.flatMap(list => inline(list, found).map(d => d.delegator.id)))]
    return new Map((await accountRefs(ids)).accounts.map(a => [a.id, a]))
}

/** What the delegations a standard vote counts add up to. */
export function delegationTotals(list: CountedDelegation[]) {
    return {
        delegatorCount: list.length,
        delegatedCapital: String(list.reduce((n, d) => n + BigInt(d.balance), 0n)),
        delegatedVotes: String(list.reduce((n, d) => n + BigInt(d.votes), 0n)),
    }
}

/** A standard vote with the delegations it counts, biggest first. */
export function voteEntry(v: VoteShape & {id: string; block: number}, voter: {id: string; acc?: AccountRef}, list: CountedDelegation[], found: Set<string>, refs: Map<string, AccountRef>, ss58: number): VoteEntry {
    const addr = (id: string) => ss58Encode(id, ss58)
    return {
        id: v.id,
        addr: addr(voter.id),
        acc: voter.acc,
        conviction: convictionLabel(v.conviction),
        capital: String(capitalOf(v)),
        selfVotes: v.votes,
        ...delegationTotals(list),
        delegators: inline(list, found).map(d => ({
            addr: addr(d.delegator.id),
            acc: refs.get(d.delegator.id),
            conviction: convictionLabel(d.conviction),
            capital: d.balance,
            votes: d.votes,
        })),
        block: v.block,
    }
}
