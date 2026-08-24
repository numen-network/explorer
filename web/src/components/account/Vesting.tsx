import type {ReactNode} from 'react'
import {BlockLink} from '@/components/links'
import {chainHeads, type ChainProps} from '@/lib/chain'
import {fmtBalance} from '@/lib/format'
import {vestedAt, type Schedule} from './shared'

export default async function Vesting({vest, chain}: {vest: Schedule[]; chain: ChainProps}) {
    const {best} = await chainHeads()
    return (
        <div className="card space-y-6 px-6 py-5">
            {vest.map((v, i) => {
                const done = vestedAt(v, best)
                const pct = v.locked > 0n ? Number((done * 10000n) / v.locked) / 100 : 100
                const rows: [string, ReactNode][] = [
                    ['Per block', fmtBalance(v.perBlock, chain.decimals, chain.symbol)],
                    ['Released', fmtBalance(done, chain.decimals, chain.symbol)],
                    ['Still locked', fmtBalance(v.locked - done, chain.decimals, chain.symbol)],
                    ['Starts at', <BlockLink key="s" height={v.start} />],
                    ['Fully vested at', <BlockLink key="e" height={v.end} />],
                ]
                return (
                    <div key={i}>
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <span className="text-sm font-medium">{fmtBalance(v.locked, chain.decimals, chain.symbol)}</span>
                            <span className="text-xs text-sub">{pct.toFixed(2)}% released</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg">
                            <div className="h-full rounded-full bg-accent" style={{width: `${Math.min(100, pct)}%`}} />
                        </div>
                        <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-1.5 text-sm sm:grid-cols-2">
                            {rows.map(([label, value]) => (
                                <div key={label} className="flex gap-4">
                                    <dt className="w-36 shrink-0 text-sub">{label}</dt>
                                    <dd className="min-w-0 font-mono">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )
            })}
            <p className="text-xs text-faint">released funds stay locked until someone calls vest on this account</p>
        </div>
    )
}
