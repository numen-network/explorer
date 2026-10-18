// what a balance puts on a tally under a Conviction variant, a tenth of it for
// None and N times it for LockedNx
export function convictionVotes(conviction: string, balance: bigint): bigint {
    if (conviction === 'None') return balance / 10n
    const level = /^Locked([1-6])x$/.exec(conviction)
    if (level == null) throw new Error(`unhandled conviction ${conviction}`)
    return balance * BigInt(level[1])
}
