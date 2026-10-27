// Conviction variant names, None counts a tenth and LockedNx counts N times over
export const convictionLevel = (name: string | null) => (name == null || name === 'None' ? 0 : Number(name.slice(6, -1)))

/** The short form of a conviction level, 0.1x for None and Nx for LockedNx. */
export const levelLabel = (level: number) => (level === 0 ? '0.1x' : `${level}x`)

export const convictionLabel = (name: string | null) => levelLabel(convictionLevel(name))

/** What an amount puts on the tally under a conviction. */
export function weigh(amount: string | bigint, conviction: string | null): bigint {
    const level = convictionLevel(conviction)
    return level === 0 ? BigInt(amount) / 10n : BigInt(amount) * BigInt(level)
}

/** The most votes an account can bring to one referendum, its balance at the top conviction plus its biggest track of delegations. */
export const votesPower = (balance: string, maxTrackVotes: bigint) => weigh(balance, 'Locked6x') + maxTrackVotes

export interface VoteShape {
    kind: string
    aye: boolean | null
    conviction: string | null
    balance: string | null
    ayeAmount: string | null
    nayAmount: string | null
    abstainAmount: string | null
    votes: string
}

/** The capital a vote puts up, the balance of a standard vote or the parts of a split summed. */
export const capitalOf = (v: VoteShape) => BigInt(v.balance ?? 0) + BigInt(v.ayeAmount ?? 0) + BigInt(v.nayAmount ?? 0) + BigInt(v.abstainAmount ?? 0)

export type VoteSide = 'aye' | 'nay' | 'abstain'

/**
 * Each side a vote takes, with the capital it puts there and the votes that
 * come of it. A split has no conviction of its own and counts at None.
 */
export function voteParts(v: VoteShape): {side: VoteSide; capital: bigint; votes: bigint}[] {
    if (v.kind === 'Standard') return [{side: v.aye ? 'aye' : 'nay', capital: BigInt(v.balance!), votes: BigInt(v.votes)}]
    const part = (side: VoteSide, amount: string | null) => ({side, capital: BigInt(amount ?? 0), votes: weigh(amount ?? '0', 'None')})
    const parts = [part('aye', v.ayeAmount), part('nay', v.nayAmount)]
    return v.kind === 'SplitAbstain' ? [...parts, part('abstain', v.abstainAmount)] : parts
}

/** The side a vote list files a vote under. */
export type Decision = 'aye' | 'nay' | 'split' | 'abstain'

export const decisionOf = (v: {kind: string; aye: boolean | null}): Decision => (v.kind === 'Standard' ? (v.aye ? 'aye' : 'nay') : v.kind === 'Split' ? 'split' : 'abstain')
