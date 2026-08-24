import Link from 'next/link'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import {fmtBalance} from '@/lib/format'
import {type BountyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const TONES: Record<string, 'pos' | 'neg' | 'warn' | 'idle' | 'accent'> = {
    proposed: 'idle',
    approved: 'accent',
    approved_with_curator: 'accent',
    funded: 'accent',
    curator_proposed: 'warn',
    active: 'pos',
    pending_payout: 'warn',
    claimed: 'pos',
    rejected: 'neg',
    cancelled: 'idle',
}

export function bountyStatusLabel(s: string): string {
    const text = s.replaceAll('_', ' ')
    return text[0].toUpperCase() + text.slice(1)
}

export function bountyStatusTone(s: string) {
    return TONES[s] ?? 'idle'
}

export function RefCell({r}: {r?: {index: number; status: string} | null}) {
    if (!r) return <span className="text-faint">—</span>
    return (
        <Link href={`/referendum/${r.index}`} className="font-mono text-accent hover:underline">
            #{r.index}
        </Link>
    )
}

export function BountyTable({rows, chain}: {rows: BountyRow[]; chain: {ss58: number; decimals: number; symbol: string}}) {
    return (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(24ch,1fr)_max-content_max-content_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Bounty</th>
                        <th className="text-right">Value</th>
                        <th>Curator</th>
                        <th>Referendum</th>
                        <th>Status</th>
                        <th className="text-right">Updated</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.length === 0 && (
                        <tr>
                            <td colSpan={7} className="py-6 text-sub">
                                No bounties yet.
                            </td>
                        </tr>
                    )}
                    {rows.map(b => (
                        <tr key={b.id}>
                            <td className="font-mono text-sub">{b.index}</td>
                            <td>
                                <Link href={`/bounty/${b.index}`} className="block truncate font-medium hover:text-accent" title={b.description ?? undefined}>
                                    {b.description ?? `Bounty #${b.index}`}
                                </Link>
                            </td>
                            <td className="text-right font-mono">{fmtBalance(b.value, chain.decimals, chain.symbol)}</td>
                            <td>
                                {b.curator ? <AccountLink addr={ss58Encode(b.curator.id, chain.ss58)} acc={b.curator} /> : <span className="text-faint">—</span>}
                            </td>
                            <td>
                                <RefCell r={b.referendum} />
                            </td>
                            <td>
                                <Tag text={bountyStatusLabel(b.status)} tone={bountyStatusTone(b.status)} />
                            </td>
                            <td className="text-right">
                                <BlockLink height={b.updatedAt} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
