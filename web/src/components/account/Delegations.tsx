import type {ReactNode} from 'react'
import Pager from '@/components/Pager'
import AccountLink from '@/components/AccountLink'
import {BlockLink} from '@/components/links'
import {FilterChip} from '@/components/pills'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {delegationsInPage, delegationsOutFor, trackList, type DelegationRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'
import {num, tabHref, trackLabel, type TabCtx} from './shared'

const PAGE = 25

function Table({label, rows, chain}: {label: string; rows: DelegationRow[]; chain: ChainProps}) {
    return (
        <div className="card overflow-x-auto">
            <table className="gtable w-full text-sm whitespace-nowrap grid-cols-[max-content_minmax(18ch,1fr)_max-content_max-content_max-content]">
                <thead>
                    <tr>
                        <th>Track</th>
                        <th>{label}</th>
                        <th>Conviction</th>
                        <th className="text-right">Amount</th>
                        <th className="text-right">Since</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map(d => {
                        const other = d.target ?? d.who
                        return (
                            <tr key={d.id}>
                                <td className="text-[13px]">{trackLabel(d.track.name)}</td>
                                <td>{other && <AccountLink addr={ss58Encode(other.id, chain.ss58)} acc={other} />}</td>
                                <td className="font-mono">{d.conviction}</td>
                                <td className="text-right font-mono">{fmtBalance(d.balance, chain.decimals, chain.symbol)}</td>
                                <td className="text-right">
                                    <BlockLink height={d.block} />
                                </td>
                            </tr>
                        )
                    })}
                </tbody>
            </table>
        </div>
    )
}

export default async function Delegations({hex, addr, chain, sp}: TabCtx) {
    const page = num(sp, 'dpage')
    const track = sp.dtrack ? String(sp.dtrack) : ''
    const [{delegations: out}, {tracks}] = await Promise.all([delegationsOutFor(hex), trackList()])
    const dIn = await delegationsInPage(hex, tracks.map(t => t.id), track, PAGE, (page - 1) * PAGE)

    const href = (extra: Record<string, string | number>) => tabHref(addr, 'delegations', {dtrack: track, ...extra})
    const filter: ReactNode = dIn.all > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="mr-1 text-xs text-sub">Track</span>
            <FilterChip label="All" count={dIn.all} href={tabHref(addr, 'delegations')} active={!track} />
            {tracks
                .filter(t => dIn.perTrack[t.id] > 0)
                .map(t => (
                    <FilterChip key={t.id} label={trackLabel(t.name)} count={dIn.perTrack[t.id]} href={tabHref(addr, 'delegations', {dtrack: t.id})} active={track === t.id} />
                ))}
        </div>
    )

    return (
        <div className="space-y-3">
            {out.length > 0 && <Table label="Delegating to" rows={out} chain={chain} />}
            {(dIn.rows.length > 0 || filter) && (
                <div>
                    {filter}
                    <Table label="Delegated from" rows={dIn.rows} chain={chain} />
                    {dIn.total > PAGE && <Pager page={page} pageCount={Math.ceil(dIn.total / PAGE)} href={n => href({dpage: n})} />}
                </div>
            )}
        </div>
    )
}
