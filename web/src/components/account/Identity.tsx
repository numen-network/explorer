import AccountLink from '@/components/AccountLink'
import {DetailCard, DetailRow} from '@/components/Detail'
import {Tag} from '@/components/pills'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import type {AccountRow} from '@/lib/gql'
import {identityJudgements, identityLabel, identityRows} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {JUDGEMENT_TONE, NONE} from './shared'

// the identity channels sit two to a line, so the label column is tighter here
const ROW = 'flex gap-3 px-5 py-2.5 text-sm'
const LABEL = 'w-20 shrink-0 text-sub'

// the registration the account made itself, the sub card next to it only
// names the super it hangs under
function Registration({json, chain}: {json: unknown; chain: ChainProps}) {
    const judgements = identityJudgements(json)
    return (
        <>
            <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2">
                {identityRows(json).map(([label, value], i) => (
                    <div key={label} className={`${ROW} ${i > 0 ? 'border-t border-edge' : ''} ${i === 1 ? 'sm:border-t-0' : ''} sm:odd:border-r sm:odd:border-edge`}>
                        <div className={LABEL}>{label}</div>
                        <div className="min-w-0 font-mono break-all">{value ?? NONE}</div>
                    </div>
                ))}
            </div>
            <DetailRow label="Judgements">
                {judgements.length === 0 ? (
                    NONE
                ) : (
                    <span className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                        {judgements.map(j => (
                            <span key={j.registrar} className="flex items-center gap-1.5">
                                <Tag text={j.kind} tone={JUDGEMENT_TONE[j.kind] ?? 'idle'} />
                                <span className="text-xs text-faint">registrar #{j.registrar}</span>
                                {j.fee && <span className="text-xs text-faint">fee {fmtBalance(j.fee, chain.decimals, chain.symbol)}</span>}
                            </span>
                        ))}
                    </span>
                )}
            </DetailRow>
        </>
    )
}

export default function Identity({a, chain}: {a: AccountRow; chain: ChainProps}) {
    const sup = a.identitySuper
    return (
        <div className="grid gap-4">
            {a.identityJson != null && (
                <DetailCard title="Identity">
                    <Registration json={a.identityJson} chain={chain} />
                </DetailCard>
            )}
            {sup && (
                <DetailCard title="Sub identity">
                    <DetailRow label="Display">{identityLabel({identitySubName: a.identitySubName, identitySuper: sup}) ?? NONE}</DetailRow>
                    <DetailRow label="Sub of">
                        <AccountLink addr={ss58Encode(sup.id, chain.ss58)} acc={sup} />
                    </DetailRow>
                </DetailCard>
            )}
        </div>
    )
}
