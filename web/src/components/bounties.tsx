import Link from 'next/link'
import type {BadgeVariant} from '@/components/ui/badge'
import {NONE} from '@/components/Detail'

// BountyStatus and ChildBountyStatus variants, then the events that drop one
const TONES: Record<string, BadgeVariant> = {
    Proposed: 'idle',
    Approved: 'primary',
    ApprovedWithCurator: 'primary',
    Funded: 'primary',
    CuratorProposed: 'warn',
    Active: 'pos',
    PendingPayout: 'warn',
    BountyClaimed: 'pos',
    BountyRejected: 'neg',
    BountyCanceled: 'idle',
    Added: 'idle',
    Claimed: 'pos',
    Canceled: 'idle',
}

export function bountyStatusTone(s: string): BadgeVariant {
    return TONES[s] ?? 'idle'
}

export function RefCell({r}: {r?: {index: number; status: string} | null}) {
    if (!r) return NONE
    return (
        <Link href={`/referendum/${r.index}`} className="font-mono text-primary hover:underline">
            #{r.index}
        </Link>
    )
}
