// the N of a LockedNx Conviction variant, 0 for None
export function convictionLevel(conviction: string): number {
    if (conviction === 'None') return 0
    const level = /^Locked([1-6])x$/.exec(conviction)
    if (level == null) throw new Error(`unhandled conviction ${conviction}`)
    return Number(level[1])
}

// what a balance puts on a tally under a Conviction variant, a tenth of it for
// None and N times it for LockedNx
export function convictionVotes(conviction: string, balance: bigint): bigint {
    const level = convictionLevel(conviction)
    return level === 0 ? balance / 10n : balance * BigInt(level)
}
