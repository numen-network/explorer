// still on the clock, so its bars and thresholds move with the head
export const isLive = (status: string) => status === 'DECIDING' || status === 'CONFIRMING'

// how far a phase has run, past one once its period is over, null before it starts
export const phaseFraction = (since: number | null, period: number, best: number) => (since !== null && period > 0 ? (best - since) / period : null)
