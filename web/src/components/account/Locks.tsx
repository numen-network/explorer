import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {NONE, type LockRow} from './shared'

export default function Locks({rows, chain}: {rows: LockRow[]; chain: ChainProps}) {
    return (
        <div>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(18ch,1fr)]">
                    <thead>
                        <tr>
                            <th>Kind</th>
                            <th>Source</th>
                            <th className="text-right">Amount</th>
                            <th>Unlocks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(r => (
                            <tr key={`${r.kind}-${r.source}`}>
                                <td>
                                    <Tag text={r.kind} tone={r.kind === 'Frozen' ? 'accent' : 'idle'} />
                                </td>
                                <td>{r.source}</td>
                                <td className="text-right font-mono">{fmtBalance(r.amount, chain.decimals, chain.symbol)}</td>
                                <td className="text-sub">
                                    {r.until != null ? (
                                        <>
                                            until <BlockLink height={r.until} />
                                        </>
                                    ) : r.freedBy ? (
                                        r.freedBy
                                    ) : r.unattributed ? (
                                        <span className="text-faint">the chain records no reason for a plain reserve</span>
                                    ) : (
                                        NONE
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <p className="mt-2 text-xs text-faint">frozen locks overlap rather than add up, the frozen balance follows the largest one</p>
        </div>
    )
}
