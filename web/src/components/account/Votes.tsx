import Link from 'next/link'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {fmtBalance} from '@/lib/format'
import {votesFor} from '@/lib/gql'
import type {TabCtx} from './shared'

export default async function Votes({hex, chain}: TabCtx) {
    const {votes} = await votesFor(hex)
    return (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(max-content,1fr)_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Referendum</th>
                        <th>Vote</th>
                        <th>Conviction</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Block</th>
                    </tr>
                </thead>
                <tbody>
                    {votes.map(v => (
                        <tr key={v.id}>
                            <td>
                                <Link href={`/referendum/${v.referendum.index}`} className="font-mono text-accent hover:underline">
                                    #{v.referendum.index}
                                </Link>
                            </td>
                            <td>
                                <Tag text={v.decision} tone={v.decision === 'aye' ? 'pos' : v.decision === 'nay' ? 'neg' : 'idle'} />
                            </td>
                            <td className="font-mono">{v.conviction ?? '—'}</td>
                            <td className="text-right font-mono">{fmtBalance(v.amount, chain.decimals, chain.symbol)}</td>
                            <td className="text-right">
                                <BlockLink height={v.block} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
