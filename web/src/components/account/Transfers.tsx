import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {ExtrinsicLink} from '@/components/links'
import {FilterChip} from '@/components/pills'
import {CallPill} from '@/components/calls'
import {TimeCell, TimeModeButton} from '@/components/TimeCell'
import {fmtBalance} from '@/lib/format'
import {transfersFor} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {NONE, num, tabHref, type TabCtx} from './shared'

const PAGE = 25

export default async function Transfers({hex, addr, label, chain, sp}: TabCtx) {
    const dir = sp.dir === 'in' || sp.dir === 'out' ? sp.dir : ''
    const page = num(sp, 'xpage')
    const {transfers, conn} = await transfersFor(hex, dir, PAGE, (page - 1) * PAGE)
    const self = <span className="truncate text-faint">{label}</span>
    const dirHref = (d: string) => tabHref(addr, 'transfers', {dir: d})

    return (
        <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-xs text-sub">Direction</span>
                <FilterChip label="All" href={dirHref('')} active={!dir} />
                <FilterChip label="Out" href={dirHref('out')} active={dir === 'out'} />
                <FilterChip label="In" href={dirHref('in')} active={dir === 'in'} />
            </div>
            <div className="card overflow-x-auto">
                <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_max-content_max-content_minmax(18ch,max-content)_minmax(18ch,1fr)_max-content]">
                    <thead>
                        <tr>
                            <th>Extrinsic</th>
                            <th>
                                <TimeModeButton />
                            </th>
                            <th>Call</th>
                            <th>From</th>
                            <th>To</th>
                            <th className="text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transfers.length === 0 && (
                            <tr>
                                <td colSpan={6} className="py-5 text-sub">
                                    None
                                </td>
                            </tr>
                        )}
                        {transfers.map(t => {
                            const out = t.from.id === hex
                            const other = out ? t.to : t.from
                            const link = <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />
                            return (
                                <tr key={t.id}>
                                    <td>{t.extrinsic ? <ExtrinsicLink id={t.extrinsic.id} hash={t.extrinsic.hash} /> : NONE}</td>
                                    <td className="text-sub">
                                        <TimeCell iso={t.timestamp} />
                                    </td>
                                    <td>
                                        <CallPill call={t.call} />
                                    </td>
                                    <td>{out ? self : link}</td>
                                    <td>{out ? link : self}</td>
                                    <td className="text-right font-mono">{fmtBalance(t.amount, chain.decimals, chain.symbol)}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {conn.totalCount > PAGE && (
                <Pager page={page} pageCount={Math.ceil(conn.totalCount / PAGE)} href={n => tabHref(addr, 'transfers', {dir, xpage: n})} />
            )}
        </>
    )
}
