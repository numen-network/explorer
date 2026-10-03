import AccountLink from '@/components/AccountLink'
import Pager from '@/components/Pager'
import {Card} from '@/components/ui/card'
import {multisigOpsFor} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {ss58Encode} from '@/lib/ss58'
import {MultisigTable} from './MultisigTable'
import {tabHref, type TabCtx} from './shared'

export default async function Multisig({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const {multisigOps, conn, signed} = await multisigOpsFor(hex, pg.size, pg.offset)
    const sigOp = signed[0]

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
            <Pager paging={pg} total={conn.totalCount} href={tabHref(addr, 'multisig')} />
        </div>
    )
}
