import {cn} from 'cn'
import {ReactNode} from 'react'
import {StatChips, StatLabel, type StatChip} from '@/components/StatTile'
import {Card} from '@/components/ui/card'

export interface StatItem {
    label: string
    value: ReactNode
    href?: string
    chips?: StatChip[]
}

// a run of tiles folded into one card, each figure on its label's line and its
// chips on a line of their own under both
export default function StatList({items, className}: {items: StatItem[]; className?: string}) {
    return (
        <Card size="flush" className={cn('divide-y', className)}>
            {items.map(s => (
                <div key={s.label} data-slot="stat-row" className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 px-5 py-2.5">
                    <div className="text-[13px] text-muted-foreground">
                        <StatLabel label={s.label} href={s.href} />
                    </div>
                    <div data-slot="stat-value" className="text-right text-[15px] leading-snug font-semibold tracking-tight whitespace-nowrap">
                        {s.value}
                    </div>
                    {s.chips && (
                        <div data-slot="stat-chips" className="col-span-full mt-0.5 flex flex-wrap justify-end gap-x-2.5 text-[11px] whitespace-nowrap">
                            <StatChips chips={s.chips} />
                        </div>
                    )}
                </div>
            ))}
        </Card>
    )
}
