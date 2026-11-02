import {curveAt, delay, ONE, perbill, threshold, type Curve} from './curves'
import {variantName, variantValue} from './variant'

// a system origin is one variant deep, a custom origin nests its name one level down
export const originName = (origin: unknown) => variantName(variantValue(origin)) ?? variantName(origin)

export interface RefPhaseFields {
    status: string
    decidingSince: number | null
    confirmingSince: number | null
    inQueue: boolean | null
    timeline: unknown
}

export type Phase =
    | 'WaitingForDeposit'
    | 'Preparing'
    | 'Queueing'
    | 'Deciding'
    | 'Confirming'
    | 'Approved'
    | 'Executed'
    | 'ExecutedWithError'
    | 'CallUnavailable'
    | 'PermanentlyOverweight'
    | 'Rejected'
    | 'Cancelled'
    | 'TimedOut'
    | 'Killed'

export const PHASE_LABEL: Record<Phase, string> = {
    WaitingForDeposit: 'Awaiting deposit',
    Preparing: 'Preparing',
    Queueing: 'Queueing',
    Deciding: 'Deciding',
    Confirming: 'Confirming',
    Approved: 'Approved',
    Executed: 'Executed',
    ExecutedWithError: 'Exec failed',
    CallUnavailable: 'Call unavailable',
    PermanentlyOverweight: 'Permanently overweight',
    Rejected: 'Rejected',
    Cancelled: 'Cancelled',
    TimedOut: 'Timed out',
    Killed: 'Killed',
}

export const PHASE_TIP: Record<Phase, string> = {
    WaitingForDeposit: 'Needs a decision deposit before deciding can begin',
    Preparing: 'Decision deposit placed, waiting for the prepare period to end',
    Queueing: 'Waiting in line for processing or voting to begin',
    Deciding: 'Currently open for voting',
    Confirming: 'Waiting for final checks before vote ends',
    Approved: 'Vote passed but action not yet executed',
    Executed: 'Vote passed and action taken',
    ExecutedWithError: 'Vote passed but call executed with error',
    CallUnavailable: 'The call was not found at execution',
    PermanentlyOverweight: 'Execution failed due to overweight',
    Rejected: 'Vote failed and referendum did not pass',
    Cancelled: 'Proposal withdrawn before voting completed',
    TimedOut: 'Never started deciding in time',
    Killed: 'Manually removed before voting completed',
}

const stepsOf = (timeline: unknown) => (Array.isArray(timeline) ? (timeline as {name: string; error?: string | null}[]) : [])

// the chain keeps one Ongoing status, the phase within it comes from what has
// started
function ongoingPhase(r: RefPhaseFields): Phase {
    if (r.confirmingSince != null) return 'Confirming'
    if (r.decidingSince != null) return 'Deciding'
    if (r.inQueue) return 'Queueing'
    return stepsOf(r.timeline).some(s => s.name === 'Referenda.DecisionDepositPlaced') ? 'Preparing' : 'WaitingForDeposit'
}

// the scheduler ends the enactment task with one event, which says how
function approvedPhase(timeline: unknown): Phase {
    const end = stepsOf(timeline).find(s => s.name.startsWith('Scheduler.'))
    if (end == null) return 'Approved'
    if (end.name === 'Scheduler.Dispatched') return end.error == null ? 'Executed' : 'ExecutedWithError'
    return end.name.slice('Scheduler.'.length) as Phase
}

export function phaseOf(r: RefPhaseFields): Phase {
    if (r.status === 'Ongoing') return ongoingPhase(r)
    if (r.status === 'Approved') return approvedPhase(r.timeline)
    return r.status as Phase
}

// still on the clock, so its bars and thresholds move with the head
export const isLive = (r: RefPhaseFields) => r.status === 'Ongoing' && r.decidingSince != null

// how far a phase has run, past one once its period is over, null before it starts
export const phaseFraction = (since: number | null, period: number, head: number) => (since !== null && period > 0 ? (head - since) / period : null)

// what the two curves demand of a referendum still deciding, in percent, null for one that is not
export function needsNow(r: RefPhaseFields & {trackParams: {decisionPeriod: number; minApproval: unknown; minSupport: unknown}}, head: number): {approval: number; support: number} | null {
    const ran = isLive(r) ? phaseFraction(r.decidingSince, r.trackParams.decisionPeriod, head) : null
    if (ran === null) return null
    const at = Math.min(1, Math.max(0, ran))
    return {approval: curveAt(r.trackParams.minApproval as Curve, at) * 100, support: curveAt(r.trackParams.minSupport as Curve, at) * 100}
}

interface Deciding {
    decidingSince: number
    ayes: string
    nays: string
    support: string
    trackParams: {decisionPeriod: number; minApproval: unknown; minSupport: unknown}
}

// how far into its decision period a referendum is, as the pallet's Perbill
const decisionRan = (r: Deciding, head: number) => {
    const period = BigInt(r.trackParams.decisionPeriod)
    const elapsed = BigInt(head) - BigInt(r.decidingSince)
    return perbill(elapsed < period ? elapsed : period, period)
}

/**
 * The block a deciding referendum starts confirming at if its tally holds,
 * the alarm pallet_referenda sets in decision_time, null when the tally
 * cannot pass within the decision period.
 */
export function confirmEstimate(r: Deciding, activeIssuance: bigint, head: number): number | null {
    const since = BigInt(r.decidingSince)
    const period = BigInt(r.trackParams.decisionPeriod)
    const x = decisionRan(r, head)
    const ayes = BigInt(r.ayes)
    const cast = ayes + BigInt(r.nays)
    const sides: [Curve, bigint][] = [
        [r.trackParams.minApproval as Curve, cast === 0n ? 0n : perbill(ayes, cast)],
        [r.trackParams.minSupport as Curve, perbill(BigInt(r.support), activeIssuance)],
    ]
    if (sides.some(([c, y]) => y < threshold(c, ONE))) return null
    const offset = sides.map(([c, y]) => (y >= threshold(c, x) ? 0n : delay(c, y))).reduce((a, b) => (a > b ? a : b))
    return Math.max(Number(since + (offset * period + ONE - 1n) / ONE), head + 1)
}

/**
 * What each side of a live tally has to reach now, the fewest ayes and the
 * least support that pass and the fewest nays that fail, rounding as the
 * pallet's Perbill does. Ayes is null when the threshold is one and a nay is
 * cast, nays is null when the threshold is zero.
 */
export function tallyTargets(r: Deciding, activeIssuance: bigint, head: number): {ayes: bigint | null; nays: bigint | null; support: bigint} {
    const x = decisionRan(r, head)
    const approval = threshold(r.trackParams.minApproval as Curve, x)
    const ayes = BigInt(r.ayes)
    const nays = BigInt(r.nays)
    return {
        ayes: approval === ONE ? (nays === 0n ? 1n : null) : nays === 0n && approval > 0n ? 1n : (approval * nays + ONE - approval - 1n) / (ONE - approval),
        nays: approval === 0n ? null : (ayes * (ONE - approval)) / approval + 1n,
        support: (threshold(r.trackParams.minSupport as Curve, x) * activeIssuance + ONE - 1n) / ONE,
    }
}

export interface EnactmentMoment {
    __kind: 'At' | 'After'
    value: number
}

// the support denominator, total issuance less inactive at the tally's block
export const activeIssuanceOf = (s: {totalIssuance: string; inactiveIssuance: string}) => BigInt(s.totalIssuance) - BigInt(s.inactiveIssuance)

// approval as a fraction of the votes cast, none cast reading as none approving
export function approvalOf(s: {ayes: string; nays: string}): [part: bigint, whole: bigint] {
    const ayes = BigInt(s.ayes)
    const cast = ayes + BigInt(s.nays)
    return cast > 0n ? [ayes, cast] : [0n, 1n]
}
