import type {UpcomingBountyRow, UpcomingReferendumRow, UpcomingSpendRow, UpcomingWindow} from '@/lib/gql'

/** A deadline on the clock, worded the way the home page reads it. */
export interface Deadline {
    id: string
    label: string
    href: string
    title: string
    action: string
    blocks: number
}

const DAY = 86_400

export function upcomingWindow(head: number, blockTime: number): UpcomingWindow {
    const blocksIn = (days: number) => head + Math.floor((days * DAY) / blockTime)
    return {head, until: blocksIn(7), validUntil: blocksIn(3)}
}

function referendumDeadlines(r: UpcomingReferendumRow, w: UpcomingWindow, undecidingTimeout: number): Deadline[] {
    const at = (action: string, target: number) => ({
        id: `referendum-${r.index}-${action}`,
        label: `Referendum #${r.index}`,
        href: `/referendum/${r.index}`,
        title: r.title ?? `Referendum #${r.index}`,
        action,
        blocks: target - w.head,
    })
    if (r.confirmingSince != null) return [at('will end confirming', r.confirmingSince + r.track.confirmPeriod)]
    if (r.decidingSince != null) return [at('will end deciding', r.decidingSince + r.track.decisionPeriod)]
    return [at('will end preparing', r.submittedAt + r.track.preparePeriod), at('will time out', r.submittedAt + undecidingTimeout)]
}

function spendDeadline(s: UpcomingSpendRow, w: UpcomingWindow): Deadline {
    const index = s.id.split('-')[1]
    const valid = s.validFrom > w.head
    return {
        id: `spend-${index}`,
        label: `Treasury spend #${index}`,
        href: s.referendum ? `/referendum/${s.referendum.index}` : '/governance?tab=treasury',
        title: s.referendum?.title ?? `Treasury spend #${index}`,
        action: valid ? 'will be valid' : 'will expire',
        blocks: (valid ? s.validFrom : s.expireAt) - w.head,
    }
}

function bountyDeadline(b: UpcomingBountyRow, w: UpcomingWindow): Deadline {
    return {
        id: `bounty-${b.index}`,
        label: `Bounty #${b.index}`,
        href: `/bounty/${b.index}`,
        title: b.description ?? `Bounty #${b.index}`,
        action: 'curator update due',
        blocks: b.updateDue - w.head,
    }
}

// spends and bounties arrive cut to the window, referendum deadlines are worked out here
// from their track periods. the three kinds share one clock, so the merge sorts by blocks left
export function deadlines(
    data: {ongoing: UpcomingReferendumRow[]; spendsValid: UpcomingSpendRow[]; spendsExpire: UpcomingSpendRow[]; bountiesDue: UpcomingBountyRow[]},
    w: UpcomingWindow,
    undecidingTimeout: number
): Deadline[] {
    const refs = data.ongoing.flatMap(r => referendumDeadlines(r, w, undecidingTimeout)).filter(d => d.blocks > 0 && w.head + d.blocks <= w.until)
    const rest = [...data.spendsValid, ...data.spendsExpire].map(s => spendDeadline(s, w)).concat(data.bountiesDue.map(b => bountyDeadline(b, w)))
    return [...refs, ...rest].sort((a, b) => a.blocks - b.blocks)
}

// side by side with Transfers the card keeps five 66px rows, each strip takes the place of
// one referendum, and an open list takes four slots at most and scrolls past that
export const SHOWN = 3
export const closedSlots = (n: number) => Math.min(n, SHOWN)
export const openSlots = (n: number) => (n > SHOWN ? 4 : closedSlots(n))

const VISIBLE = 5

// hides a referendum row side by side once a strip above needs its slot
export function rowHidden(i: number, n: number): string {
    if (i >= VISIBLE - closedSlots(n)) return 'lg:hidden'
    if (i >= VISIBLE - openSlots(n)) return 'lg:group-data-[state=open]/upcoming:hidden'
    return ''
}
