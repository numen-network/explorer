import AccountLink from '@/components/AccountLink'
import {Card} from '@/components/ui/card'
import {multisigOpsFor} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {MultisigTable} from './MultisigTable'
import type {TabCtx} from './shared'

export default async function Multisig({hex, chain}: TabCtx) {
    const {multisigOps} = await multisigOpsFor(hex)
    const sigOp = multisigOps.find(o => o.multisig.id === hex && o.signatories != null)

    return (
        <div>
            {sigOp && (
                <Card size="flush" className="mb-3 flex-row flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                    <span className="text-xs font-medium text-muted-foreground">
                        Signatories · {sigOp.threshold} of {sigOp.signatories!.length}
                    </span>
                    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                        {sigOp.signatories!.map(s => (
                            <AccountLink key={s} addr={ss58Encode(s, chain.ss58)} />
                        ))}
                    </div>
                </Card>
            )}
            <Card size="flush">
                <MultisigTable rows={multisigOps} hex={hex} chain={chain} />
            </Card>
        </div>
    )
}
