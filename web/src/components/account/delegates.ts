import {weigh} from '@/lib/conviction'
import type {AccountRef, DelegationStep, DelegationVoteRow, Span} from '@/lib/gql'

/** A delegate's record since the account delegated. open counts the referenda it could vote on, voted the ones it did. */
export interface Activity {
    voted: number
    open: number
    aye: number
    nay: number
    cast: string
    last: number | null
}

/** One delegation from the step that set it up to the one that ended it. */
export interface Delegation extends Span {
    target: AccountRef
    track: {id: string; name: string}
    conviction: string
    balance: string
    votes: string
}

export type TrackRow = Delegation & Activity

export interface DelegateRow extends Activity {
    key: string
    target: AccountRef
    capital: string
    since: number
    ended: boolean
    delegations: TrackRow[]
}

const maxOf = (values: bigint[]) => values.reduce((m, v) => (v > m ? v : m), 0n)

// each Delegated step opens a delegation on its track and the next Undelegated
// there closes it. one set up and undone in the same block has no conviction
// and could carry no vote, so it drops out
export function delegationsOf(steps: DelegationStep[]): Delegation[] {
    const all: Delegation[] = []
    const standing = new Map<string, {end: number | null}>()
    for (const s of steps) {
        if (s.method === 'Undelegated') {
            standing.get(s.track.id)!.end = s.block
            standing.delete(s.track.id)
        } else if (s.conviction == null) {
            standing.set(s.track.id, {end: null})
        } else {
            const d: Delegation = {id: s.id, target: s.target, track: s.track, conviction: s.conviction, balance: s.balance!, votes: weigh(s.balance!, s.conviction).toString(), block: s.block, end: null}
            standing.set(s.track.id, d)
            all.push(d)
        }
    }
    return all
}

function tally(votes: DelegationVoteRow[], open: number): Activity {
    const aye = votes.filter(v => v.aye).length
    return {
        voted: votes.length,
        open,
        aye,
        nay: votes.length - aye,
        cast: votes.reduce((n, v) => n + BigInt(v.votes), 0n).toString(),
        last: votes.length > 0 ? Math.max(...votes.map(v => v.block)) : null,
    }
}

export function combine(parts: Activity[]): Activity {
    const lasts = parts.flatMap(p => (p.last == null ? [] : [p.last]))
    return {
        voted: parts.reduce((n, p) => n + p.voted, 0),
        open: parts.reduce((n, p) => n + p.open, 0),
        aye: parts.reduce((n, p) => n + p.aye, 0),
        nay: parts.reduce((n, p) => n + p.nay, 0),
        cast: parts.reduce((n, p) => n + BigInt(p.cast), 0n).toString(),
        last: lasts.length > 0 ? Math.max(...lasts) : null,
    }
}

// a vote counts for a delegation when its delegate cast it on the track while
// the referendum overlapped the delegation, so voted never tops open
function trackRow(d: Delegation, votes: DelegationVoteRow[], open: number): TrackRow {
    const counted = votes.filter(
        ({voter, referendum: r}) => voter.id === d.target.id && r.track.id === d.track.id && (r.endedAt == null || r.endedAt >= d.block) && (d.end == null || r.submittedAt < d.end)
    )
    return {...d, ...tally(counted, open)}
}

// a delegate gets one row for its standing delegations and one for its ended ones
const rowKey = (d: Delegation) => `${d.target.id}:${d.end == null ? 'standing' : 'ended'}`

export const rowCount = (delegations: Delegation[]) => new Set(delegations.map(rowKey)).size

// standing rows come first, then ended ones, each in the order of its first
// delegation. a row's delegations keep that order too
export function delegateRows(delegations: Delegation[], votes: DelegationVoteRow[], open: Map<string, number>): DelegateRow[] {
    const byRow = new Map<string, TrackRow[]>()
    for (const d of [...delegations.filter(d => d.end == null), ...delegations.filter(d => d.end != null)])
        byRow.set(rowKey(d), [...(byRow.get(rowKey(d)) ?? []), trackRow(d, votes, open.get(d.id)!)])
    return [...byRow].map(([key, rows]) => ({
        ...combine(rows),
        key,
        target: rows[0].target,
        capital: maxOf(rows.map(t => BigInt(t.balance))).toString(),
        since: rows[0].block,
        ended: rows[0].end != null,
        delegations: rows,
    }))
}

// one delegation per track, and the conviction locks overlap, so the largest standing one is what the account has put up
export const delegatedOf = (delegations: Delegation[]) => maxOf(delegations.filter(d => d.end == null).map(d => BigInt(d.balance)))
