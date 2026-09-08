// Conviction variant names, None counts a tenth and LockedNx counts N times over
export const convictionLevel = (name: string | null) => (name == null || name === 'None' ? 0 : Number(name.slice(6, -1)))

/** The short form a vote list shows, 0x for None and Nx for LockedNx. */
export const convictionLabel = (name: string | null) => `${convictionLevel(name)}x`

/** What an amount puts on the tally under a conviction. */
export function weigh(amount: string | bigint, conviction: string | null): bigint {
    const level = convictionLevel(conviction)
    return level === 0 ? BigInt(amount) / 10n : BigInt(amount) * BigInt(level)
}

/** How many conviction periods a vote pays, doubling with each level. */
export function lockPeriods(conviction: string | null): number {
    const level = convictionLevel(conviction)
    return level === 0 ? 0 : 2 ** (level - 1)
}

export interface VoteShape {
    kind: string
    aye: boolean | null
    conviction: string | null
    balance: string | null
    ayeAmount: string | null
    nayAmount: string | null
    abstainAmount: string | null
}

/** The capital a vote puts up, the balance of a standard vote or the parts of a split summed. */
export const capitalOf = (v: VoteShape) => BigInt(v.balance ?? 0) + BigInt(v.ayeAmount ?? 0) + BigInt(v.nayAmount ?? 0) + BigInt(v.abstainAmount ?? 0)

/** What the vote itself puts on the tally, a split counts each part at a tenth. */
export const votesOf = (v: VoteShape) => (v.kind === 'Standard' ? weigh(v.balance ?? '0', v.conviction) : capitalOf(v) / 10n)

/** The side a vote list files a vote under. */
export const decisionOf = (v: {kind: string; aye: boolean | null}) => (v.kind === 'Standard' ? (v.aye ? 'aye' : 'nay') : v.kind === 'Split' ? 'split' : 'abstain')

/**
 * The block a vote lets go of its balance. Conviction is only charged to the
 * winning side, so everything else comes free the moment the referendum ends.
 */
export function unlockAt(
    vote: {kind: string; aye: boolean | null; conviction: string | null},
    poll: {status?: string; endedAt?: number | null},
    period: number
): number | null {
    if (poll.endedAt == null) return null
    const won = vote.kind === 'Standard' && ((poll.status === 'Approved' && vote.aye === true) || (poll.status === 'Rejected' && vote.aye === false))
    return poll.endedAt + (won ? period * lockPeriods(vote.conviction) : 0)
}
