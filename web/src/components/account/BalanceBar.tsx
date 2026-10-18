import {pctToNum} from '@/lib/format'

// what may leave the account against what is locked in it, a sliver of either
// still shows
export default function BalanceBar({transferable, locked}: {transferable: bigint; locked: bigint}) {
    const whole = transferable + locked
    const parts = [
        {v: transferable, bg: 'bg-good'},
        {v: locked, bg: 'bg-dim'},
    ].filter(p => p.v > 0n)
    return (
        <div data-slot="balance-bar" className="mt-2 flex h-2 gap-[3px] overflow-hidden rounded-full">
            {parts.length === 0 ? <div className="flex-1 bg-border" /> : parts.map(p => <div key={p.bg} className={`min-w-1 basis-0 ${p.bg}`} style={{flexGrow: pctToNum(p.v, whole)}} />)}
        </div>
    )
}
