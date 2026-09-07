import type {ComponentProps, CSSProperties} from 'react'
import {CircleAlert, CircleCheck, CircleQuestionMark, CircleX, type LucideIcon} from 'lucide-react'
import {cn} from 'cn'

// mirrors the pallet identity judgement enum, bad verdicts win over good ones
export type Verdict = 'verified' | 'stale' | 'pending' | 'unjudged' | 'bad'

export function verdictOf(identityJson: unknown): Verdict | null {
    if (identityJson == null) return null
    const kinds = (((identityJson as {judgements?: [number, {__kind: string}][]}).judgements ?? []) as [number, {__kind: string}][]).map(([, j]) => j.__kind)
    if (kinds.some(k => k === 'Erroneous' || k === 'LowQuality')) return 'bad'
    if (kinds.some(k => k === 'Reasonable' || k === 'KnownGood')) return 'verified'
    if (kinds.some(k => k === 'OutOfDate')) return 'stale'
    if (kinds.some(k => k === 'FeePaid')) return 'pending'
    return 'unjudged'
}

const MARKS: Record<Verdict, {fill: string; mark: LucideIcon}> = {
    verified: {fill: 'var(--color-good)', mark: CircleCheck},
    unjudged: {fill: 'var(--color-dim)', mark: CircleQuestionMark},
    pending: {fill: 'var(--color-dim)', mark: CircleQuestionMark},
    stale: {fill: 'var(--color-warn)', mark: CircleAlert},
    bad: {fill: 'var(--color-destructive)', mark: CircleX},
}

/**
 * A filled disc carrying the mark in white, which is what makes it legible at
 * the size an address line leaves for it. Lucide draws the disc as an outline,
 * so the fill goes on its circle and the white on everything drawn over it.
 */
export function MarkDisc({fill, mark: Mark, className = 'size-[1em]', ...props}: Omit<ComponentProps<LucideIcon>, 'fill'> & {fill: string; mark: LucideIcon}) {
    return (
        <Mark
            className={cn('shrink-0 [&>circle]:fill-(--fill) [&>circle]:stroke-(--fill) [&>:not(circle)]:stroke-white', className)}
            style={{'--fill': fill} as CSSProperties}
            strokeWidth={2.6}
            aria-hidden
            {...props}
        />
    )
}

/** The wallet's identity badge in the same colours, so one judgement reads alike in both. */
export function JudgementBadge({verdict, ...props}: Omit<ComponentProps<typeof MarkDisc>, 'fill' | 'mark'> & {verdict: Verdict}) {
    return <MarkDisc {...MARKS[verdict]} {...props} />
}
