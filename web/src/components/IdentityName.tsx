import {JudgementBadge, verdictOf} from '@/components/JudgementBadge'
import {identityInfoJson, identityLabel, type IdentityRef} from '@/lib/identity'

export default function IdentityName({acc}: {acc: IdentityRef}) {
    const verdict = verdictOf(identityInfoJson(acc))
    return (
        <>
            {verdict && <JudgementBadge verdict={verdict} />}
            <span className="truncate font-medium">{identityLabel(acc)}</span>
        </>
    )
}
