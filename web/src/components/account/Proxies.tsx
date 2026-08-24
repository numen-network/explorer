import AccountLink from '@/components/AccountLink'
import {Tag} from '@/components/pills'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {proxiesFor, type ProxyRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import type {TabCtx} from './shared'

function Table({label, rows, chain}: {label: string; rows: ProxyRow[]; chain: ChainProps}) {
    return (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[minmax(18ch,1fr)_max-content_max-content]">
                <thead>
                    <tr>
                        <th>{label}</th>
                        <th>Type</th>
                        <th className="text-right">Delay</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(p => {
                        const other = p.delegatee ?? p.delegator
                        return (
                            <tr key={p.id}>
                                <td>{other && <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />}</td>
                                <td>
                                    <Tag text={p.proxyType} tone={p.proxyType === 'Any' ? 'warn' : 'idle'} />
                                </td>
                                <td className="text-right font-mono">{p.delay > 0 ? fmtInt(p.delay) : '—'}</td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default async function Proxies({hex, chain}: TabCtx) {
    const rel = await proxiesFor(hex)
    return (
        <div className="space-y-3">
            {rel.out.length > 0 && <Table label="Delegates to" rows={rel.out} chain={chain} />}
            {rel.in.length > 0 && <Table label="Proxy for" rows={rel.in} chain={chain} />}
        </div>
    )
}
