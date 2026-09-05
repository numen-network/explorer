/** How many conviction periods a vote pays, doubling with each level. */
export function lockPeriods(conviction: string | null): number {
    const level = conviction == null ? 0 : Number(conviction.slice(0, -1))
    return level === 0 ? 0 : 2 ** (level - 1)
}

/**
 * The block a vote lets go of its balance. Conviction is only charged to the
 * winning side, so everything else comes free the moment the referendum ends.
 */
export function unlockAt(
    vote: {decision: string; conviction: string | null},
    poll: {status?: string; endedAt?: number | null},
    period: number
): number | null {
    if (poll.endedAt == null) return null
    const won = (poll.status === 'APPROVED' && vote.decision === 'aye') || (poll.status === 'REJECTED' && vote.decision === 'nay')
    return poll.endedAt + (won ? period * lockPeriods(vote.conviction) : 0)
}
