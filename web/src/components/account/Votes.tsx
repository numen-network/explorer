import Link from 'next/link'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {unlockAt} from '@/lib/conviction'
import {fmtBalance} from '@/lib/format'
import {votesFor} from '@/lib/gql'
import {NONE, type TabCtx} from './shared'

export default async function Votes({hex, chain}: TabCtx) {
    const {votes} = await votesFor(hex)
    return (
        <div className="card">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Referendum</th>
                        <th>Vote</th>
                        <th>Conviction</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Block</th>
                        <th>Unlocks</th>
                    </tr>
                </thead>
                <tbody>
                    {votes.map(v => {
                        const free = unlockAt(v, v.referendum, chain.voteLockingPeriod)
                        return (
                            <tr key={v.id} className={v.removed ? 'opacity-50' : undefined}>
                                <td>
                                    <Link href={`/referendum/${v.referendum.index}`} className="font-mono text-accent hover:underline">
                                        #{v.referendum.index}
                                    </Link>
                                    {v.removed && <span className="ml-2 text-[11px] text-faint">removed</span>}
                                </td>
                                <td>
                                    <Tag text={v.decision} tone={v.decision === 'aye' ? 'pos' : v.decision === 'nay' ? 'neg' : 'idle'} />
                                </td>
                                <td className="font-mono">{v.conviction ?? '—'}</td>
                                <td className="text-right font-mono">{fmtBalance(v.amount, chain.decimals, chain.symbol)}</td>
                                <td className="text-right">
                                    <BlockLink height={v.block} />
                                </td>
                                <td className="text-sub">{free != null ? <BlockLink height={free} /> : NONE}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}
