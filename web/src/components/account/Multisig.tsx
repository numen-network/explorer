import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {shortHash} from '@/lib/format'
import {multisigOpsFor} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import type {TabCtx} from './shared'

export default async function Multisig({hex, chain}: TabCtx) {
    const {multisigOps} = await multisigOpsFor(hex)
    const sigOp = multisigOps.find(o => o.multisig.id === hex && o.signatories != null)

    return (
        <div>
            {sigOp && (
                <div className="card mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 text-sm">
                    <span className="text-xs font-medium text-sub">
                        Signatories · {sigOp.threshold} of {sigOp.signatories!.length}
                    </span>
                    <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1">
                        {sigOp.signatories!.map(s => (
                            <AccountLink key={s} addr={ss58Encode(s, chain.ss58)} />
                        ))}
                    </div>
                </div>
            )}
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)_max-content_minmax(18ch,1fr)_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Call hash</th>
                            <th>Multisig</th>
                            <th>Approvals</th>
                            <th>Opened by</th>
                            <th>Status</th>
                            <th className="text-right">Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {multisigOps.map(o => (
                            <tr key={o.id}>
                                <td className="font-mono text-[13px]">{shortHash(o.callHash, 6, 4)}</td>
                                <td>
                                    <AccountLink addr={ss58Encode(o.multisig.id, chain.ss58)} acc={o.multisig} />
                                </td>
                                <td className="font-mono">
                                    {o.approvals.length}
                                    {o.threshold != null ? ` / ${o.threshold}` : ''}
                                </td>
                                <td>
                                    <AccountLink addr={ss58Encode(o.depositor.id, chain.ss58)} acc={o.depositor} />
                                </td>
                                <td>
                                    <Tag
                                        text={o.status === 'executed' ? (o.result === 'err' ? 'Exec failed' : 'Executed') : o.status === 'pending' ? 'Pending' : 'Cancelled'}
                                        tone={o.status === 'executed' ? (o.result === 'err' ? 'neg' : 'pos') : o.status === 'pending' ? 'warn' : 'idle'}
                                    />
                                </td>
                                <td className="text-right">
                                    <BlockLink height={o.updatedBlock} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
