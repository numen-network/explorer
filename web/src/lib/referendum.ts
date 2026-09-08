import {variantName, variantValue} from './variant'

// a system origin is one variant deep, a custom origin nests its name one level down
export const originName = (origin: unknown) => variantName(variantValue(origin)) ?? variantName(origin)

export interface RefPhaseFields {
    status: string
    decidingSince: number | null
    confirmingSince: number | null
}

export type Phase = 'Submitted' | 'Deciding' | 'Confirming' | 'Approved' | 'Rejected' | 'Cancelled' | 'TimedOut' | 'Killed'

// the chain keeps one Ongoing status, the phase within it comes from what has
// started
export function phaseOf(r: RefPhaseFields): Phase {
    if (r.status !== 'Ongoing') return r.status as Phase
    return r.confirmingSince != null ? 'Confirming' : r.decidingSince != null ? 'Deciding' : 'Submitted'
}

// still on the clock, so its bars and thresholds move with the head
export const isLive = (r: RefPhaseFields) => r.status === 'Ongoing' && r.decidingSince != null

// how far a phase has run, past one once its period is over, null before it starts
export const phaseFraction = (since: number | null, period: number, best: number) => (since !== null && period > 0 ? (best - since) / period : null)
