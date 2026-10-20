import AccountLink from '@/components/AccountLink'
import BioDialog from '@/components/BioDialog'
import {DetailCard, DetailRow, NONE} from '@/components/Detail'
import type {ChainProps} from '@/lib/chain'
import type {AccountRow} from '@/lib/gql'
import {identityRows, splitBio, subLabel} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'

// the identity channels sit two to a line, so the label column is tighter here
const ROW = 'flex items-center gap-3 px-5 py-2.5 text-sm'
const LABEL = 'w-20 shrink-0 text-muted-foreground'

// the registration the account made itself, the sub card below it only
// names the super it hangs under
function Registration({a, chain}: {a: AccountRow; chain: ChainProps}) {
    const json = a.identityJson
    const bio = splitBio(json).short || null
    return (
        <div className="grid grid-cols-[minmax(0,1fr)] sm:grid-cols-2">
            {identityRows(json).map(({key, label, value}, i) => (
                <div key={key} className={`${ROW} ${i > 0 ? 'border-t' : ''} ${i === 1 ? 'sm:border-t-0' : ''} sm:odd:border-r`}>
                    <div className={LABEL}>{label}</div>
                    <div className="min-w-0 flex-1 truncate font-mono">{(key === 'bio' ? bio : value) ?? NONE}</div>
                    {key === 'bio' && <BioDialog acc={a} addr={ss58Encode(a.id, chain.ss58)} size="icon-xs" className="-my-1 shrink-0" />}
                </div>
            ))}
        </div>
    )
}

export default function Identity({a, chain}: {a: AccountRow; chain: ChainProps}) {
    const sup = a.identitySuper
    return (
        <div className="grid gap-4">
            <DetailCard>{a.identityJson != null ? <Registration a={a} chain={chain} /> : <div className="px-5 py-2.5 text-sm text-muted-foreground">No direct identity</div>}</DetailCard>
            {sup && (
                <DetailCard>
                    <DetailRow label="Display">{subLabel(a) ?? NONE}</DetailRow>
                    <DetailRow label="Sub of">
                        <AccountLink addr={ss58Encode(sup.id, chain.ss58)} acc={sup} />
                    </DetailRow>
                </DetailCard>
            )}
        </div>
    )
}
