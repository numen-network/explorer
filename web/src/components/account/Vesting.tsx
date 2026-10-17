import type {ReactNode} from 'react'
import {BlockLink} from '@/components/links'
import StatTile from '@/components/StatTile'
import {Card} from '@/components/ui/card'
import {Progress} from '@/components/ui/progress'
import {chainDbHead, type ChainProps} from '@/lib/chain'
import {fmtBalance, fmtPct, pctToNum} from '@/lib/format'
import {vestedAt, type Schedule} from './shared'

// the pallet rewrites the lock only when vest runs, so whatever vested since
// then is still in it
export default async function Vesting({vest, inLock, chain}: {vest: Schedule[]; inLock: bigint; chain: ChainProps}) {
    const {height} = await chainDbHead()
    const bal = (v: bigint) => fmtBalance(v, chain.decimals, chain.symbol)
    const vested = vest.map(v => vestedAt(v, height))
    const vesting = vest.reduce((n, v, i) => n + v.locked - vested[i], 0n)
    return (
        <div className="space-y-3">
            <StatTile
                label="In lock"
                value={bal(inLock)}
                beside={[
                    {label: 'Still vesting *', value: bal(vesting)},
                    {label: 'Releasable by vest *', value: bal(inLock - vesting)},
                ]}
                even
                className="[&_[data-slot=card-title]]:text-base [&_[data-slot=card-title]]:font-medium"
            />
            {vest.map((v, i) => {
                const done = vested[i]
                const pct = v.locked > 0n ? pctToNum(done, v.locked) : 100
                const rows: [string, ReactNode][] = [
                    ['Per block', bal(v.perBlock)],
                    ['Vested', bal(done)],
                    ['Still vesting', bal(v.locked - done)],
                    ['Starts at', <BlockLink key="s" height={v.start} />],
                    ['Fully vested at', <BlockLink key="e" height={v.end} />],
                ]
                return (
                    <Card key={i} size="flush" className="px-6 py-5">
                        <div className="flex flex-wrap items-baseline justify-between gap-3">
                            <span className="text-sm font-medium">{bal(v.locked)}</span>
                            <span className="text-xs text-muted-foreground">{fmtPct(done, v.locked)} vested</span>
                        </div>
                        <Progress value={Math.min(100, pct)} className="mt-2 h-1.5 bg-background" />
                        <dl className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-x-8 gap-y-1.5 text-sm lg:grid-cols-2">
                            {rows.map(([label, value]) => (
                                <div key={label} className="flex flex-col sm:flex-row sm:gap-4">
                                    <dt className="shrink-0 text-muted-foreground sm:w-36">{label}</dt>
                                    <dd className="min-w-0 font-mono">{value}</dd>
                                </div>
                            ))}
                        </dl>
                    </Card>
                )
            })}
            <div className="px-1 text-xs text-dim">* computed from on-chain data, not raw on-chain data</div>
        </div>
    )
}
