import AccountLink from '@/components/AccountLink'
import BioDialog from '@/components/BioDialog'
import {DetailCard, DetailRow, NONE} from '@/components/Detail'
import RetiredBadge from '@/components/RetiredBadge'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {AccountRow} from '@/lib/gql'
import {identityJudgements, identityRows, splitBio, subLabel} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {JUDGEMENT_TONE} from './shared'

// the identity channels sit two to a line, so the label column is tighter here
const ROW = 'flex items-center gap-3 px-5 py-2.5 text-sm'
const LABEL = 'w-20 shrink-0 text-muted-foreground'

// the registration the account made itself, the sub card next to it only
// names the super it hangs under
function Registration({a, chain, retired}: {a: AccountRow; chain: ChainProps; retired: {index: number}[]}) {
    const json = a.identityJson
    const judgements = identityJudgements(json)
    const bio = splitBio(json).short || null
    return (
        <>
            <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2">
                {identityRows(json).map(({key, label, value}, i) => (
                    <div key={key} className={`${ROW} ${i > 0 ? 'border-t' : ''} ${i === 1 ? 'sm:border-t-0' : ''} sm:odd:border-r`}>
                        <div className={LABEL}>{label}</div>
                        <div className="min-w-0 flex-1 truncate font-mono">{(key === 'bio' ? bio : value) ?? NONE}</div>
                        {key === 'bio' && <BioDialog acc={a} addr={ss58Encode(a.id, chain.ss58)} size="icon-xs" className="-my-1 shrink-0" />}
                    </div>
                ))}
            </div>
            <DetailRow label="Judgements">
                {judgements.length === 0 ? (
                    NONE
                ) : (
                    <ul className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-1.5 gap-y-2">
                        {judgements.map(j => (
                            <li key={j.registrar} className="col-span-2 grid grid-cols-subgrid items-baseline">
                                <Badge variant={JUDGEMENT_TONE[j.kind] ?? 'idle'}>{j.kind}</Badge>
                                <span className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-xs text-dim">
                                    <span>registrar #{j.registrar}</span>
                                    {retired.some(r => r.index === j.registrar) && <RetiredBadge />}
                                    {j.fee && <span>fee {fmtBalance(j.fee, chain.decimals, chain.symbol)}</span>}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </DetailRow>
        </>
    )
}

export default function Identity({a, chain, retired}: {a: AccountRow; chain: ChainProps; retired: {index: number}[]}) {
    const sup = a.identitySuper
    return (
        <div className="grid gap-4">
            {(a.identityJson != null || a.username != null) && (
                <DetailCard title="Identity">
                    {a.identityJson != null && <Registration a={a} chain={chain} retired={retired} />}
                    <DetailRow label="Username">{a.username ?? NONE}</DetailRow>
                </DetailCard>
            )}
            {sup && (
                <DetailCard title="Sub identity">
                    <DetailRow label="Display">{subLabel(a) ?? NONE}</DetailRow>
                    <DetailRow label="Sub of">
                        <AccountLink addr={ss58Encode(sup.id, chain.ss58)} acc={sup} />
                    </DetailRow>
                </DetailCard>
            )}
        </div>
    )
}
