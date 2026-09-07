import Link from 'next/link'
import type {BadgeVariant} from '@/components/ui/badge'

const TONES: Record<string, BadgeVariant> = {
    proposed: 'idle',
    approved: 'primary',
    approved_with_curator: 'primary',
    funded: 'primary',
    curator_proposed: 'warn',
    active: 'pos',
    pending_payout: 'warn',
    claimed: 'pos',
    rejected: 'neg',
    cancelled: 'idle',
}

export function bountyStatusLabel(s: string): string {
    const text = s.replaceAll('_', ' ')
    return text[0].toUpperCase() + text.slice(1)
}

export function bountyStatusTone(s: string): BadgeVariant {
    return TONES[s] ?? 'idle'
}

export function RefCell({r}: {r?: {index: number; status: string} | null}) {
    if (!r) return <span className="text-dim">—</span>
    return (
        <Link href={`/referendum/${r.index}`} className="font-mono text-primary hover:underline">
            #{r.index}
        </Link>
    )
}
