import type {ReactNode} from 'react'
import {JudgementBadge, verdictOf} from '@/components/JudgementBadge'
import {identityInfoJson, identityLabel, type IdentityRef} from '@/lib/identity'

export default function IdentityName({acc, fallback}: {acc?: IdentityRef; fallback?: ReactNode}) {
    const verdict = verdictOf(identityInfoJson(acc))
    const label = identityLabel(acc)
    return (
        <>
            {/* the badge keeps to the first line of an address that wraps */}
            {verdict && (
                <span className="flex h-lh shrink-0 items-center self-start">
                    <JudgementBadge verdict={verdict} />
                </span>
            )}
            {label ? <span className="truncate font-medium">{label}</span> : fallback}
        </>
    )
}
