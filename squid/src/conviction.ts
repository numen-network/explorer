// None locks nothing and counts a tenth, LockedNx counts N times over
export function convictionLabel(c: {__kind: string}): string {
    return c.__kind === 'None' ? '0x' : c.__kind.replace('Locked', '')
}

export const convictionLevel = (c: {__kind: string}) => Number(convictionLabel(c).slice(0, -1))

export function convictionVotes(amount: bigint, level: number): bigint {
    return level === 0 ? amount / 10n : amount * BigInt(level)
}
