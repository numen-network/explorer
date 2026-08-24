import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {chainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import {validatorsData} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'
export const metadata = {title: 'Validators'}

export default async function ValidatorsPage() {
    const [chain, {validators}] = await Promise.all([chainProps(), validatorsData()])
    const active = validators.filter(v => v.active).length

    return (
        <div>
            <div className="mt-6 flex items-baseline justify-between">
                <h1 className="text-lg font-semibold">Validators</h1>
                <span className="text-xs text-sub">
                    {fmtInt(active)} active · {fmtInt(validators.length)} known
                </span>
            </div>
            <div className="card mt-3 overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(18ch,1fr)_max-content_max-content_max-content_max-content_max-content_max-content_max-content]">
                    <thead>
                        <tr>
                            <th>Validator</th>
                            <th>Status</th>
                            <th className="text-right">Locked</th>
                            <th className="text-right">Lock expiry</th>
                            <th className="text-right">Offline sessions</th>
                            <th className="text-right">Equivocations</th>
                            <th className="text-right">First seen</th>
                            <th className="text-right">Last session</th>
                        </tr>
                    </thead>
                    <tbody>
                        {validators.map(v => (
                            <tr key={v.id}>
                                <td>
                                    <AccountLink full addr={ss58Encode(v.account.id, chain.ss58)} acc={v.account} />
                                </td>
                                <td>
                                    <Tag
                                        text={v.kicked ? `Kicked · ${v.kicked}` : v.active ? 'Active' : 'Inactive'}
                                        tone={v.kicked ? 'neg' : v.active ? 'pos' : 'idle'}
                                    />
                                </td>
                                <td className="text-right font-mono">{fmtBalance(v.lockedAmount, chain.decimals, chain.symbol)}</td>
                                <td className="text-right font-mono">{v.lockExpiry ? fmtInt(v.lockExpiry) : '—'}</td>
                                <td className="text-right font-mono">{fmtInt(v.offlineSessions)}</td>
                                <td className="text-right font-mono">{fmtInt(v.equivocations)}</td>
                                <td className="text-right">
                                    <BlockLink height={v.firstSeenBlock} />
                                </td>
                                <td className="text-right font-mono">#{fmtInt(v.lastActiveSession)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
