// the N of a LockedNx Conviction variant, 0 for None
export function convictionLevel(conviction: string): number {
    if (conviction === 'None') return 0
    const level = /^Locked([1-6])x$/.exec(conviction)
    if (level == null) throw new Error(`unhandled conviction ${conviction}`)
    return Number(level[1])
}

// how many vote locking periods a winning vote stays locked, doubling with each level
export const lockPeriods = (level: number) => (level === 0 ? 0 : 2 ** (level - 1))

// what a balance puts on a tally under a Conviction variant, a tenth of it for
// None and N times it for LockedNx
export function convictionVotes(conviction: string, balance: bigint): bigint {
    const level = convictionLevel(conviction)
    return level === 0 ? balance / 10n : balance * BigInt(level)
}

// what an AccountVote casts on its own, each split part weighing as None the way Tally::add does
export function ownVotes(v: {kind: string; conviction: string | null; balance: bigint | null; ayeAmount: bigint | null; nayAmount: bigint | null; abstainAmount: bigint | null}): bigint {
    if (v.kind === 'Standard') return convictionVotes(v.conviction!, v.balance!)
    return [v.ayeAmount, v.nayAmount, v.abstainAmount].reduce<bigint>((sum, part) => sum + convictionVotes('None', part ?? 0n), 0n)
}
