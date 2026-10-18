import type {VoteEntry} from '@/components/votes'
import {capitalOf, convictionLabel, votesOf, weigh, type VoteShape} from './conviction'
import {accountRefs, type AccountRef} from './gql'
import {ss58Encode} from './ss58'

// the panel answers who is behind the vote, the full roster lives on the
// delegate account page
const INLINE_DELEGATORS = 10

export interface CountedDelegation {
    conviction: string
    balance: string
    delegator: {id: string}
}

/** Identities of the delegators each vote's panel lists. */
export async function inlineRefs(lists: CountedDelegation[][]): Promise<Map<string, AccountRef>> {
    const ids = [...new Set(lists.flatMap(list => list.slice(0, INLINE_DELEGATORS).map(d => d.delegator.id)))]
    return new Map((await accountRefs(ids)).accounts.map(a => [a.id, a]))
}

/** A standard vote with the delegations it counts, biggest first. */
export function voteEntry(v: VoteShape & {id: string}, voter: {id: string; acc?: AccountRef}, list: CountedDelegation[], refs: Map<string, AccountRef>, ss58: number): VoteEntry {
    const addr = (id: string) => ss58Encode(id, ss58)
    return {
        id: v.id,
        addr: addr(voter.id),
        acc: voter.acc,
        conviction: convictionLabel(v.conviction),
        capital: String(capitalOf(v)),
        selfVotes: String(votesOf(v)),
        delegatorCount: list.length,
        delegatedCapital: String(list.reduce((n, d) => n + BigInt(d.balance), 0n)),
        delegatedVotes: String(list.reduce((n, d) => n + weigh(d.balance, d.conviction), 0n)),
        delegators: list.slice(0, INLINE_DELEGATORS).map(d => ({
            addr: addr(d.delegator.id),
            acc: refs.get(d.delegator.id),
            conviction: convictionLabel(d.conviction),
            capital: d.balance,
            votes: String(weigh(d.balance, d.conviction)),
        })),
    }
}
