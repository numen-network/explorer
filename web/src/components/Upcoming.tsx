'use client'

import {useState, type ReactNode} from 'react'
import Link from 'next/link'
import {cn} from 'cn'
import {Tip} from '@/components/Tip'
import {Card} from '@/components/ui/card'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {fmtSpan} from '@/lib/format'
import {SHOWN, closedSlots, type Deadline} from '@/lib/upcoming'

// the strips fill whole referendum slots, so the card stays level with its neighbour
const CLOSED_H = ['', 'lg:h-[66px]', 'lg:h-[132px]', 'lg:h-[198px]']
const OPEN_H = 'lg:group-data-[state=open]/upcoming:h-[264px]'

function Strip({d, blockTime}: {d: Deadline; blockTime: number}) {
    return (
        <div className="flex min-h-10 shrink-0 items-center rounded-md bg-muted px-4 py-2 text-[13px] font-medium lg:h-10 lg:py-0">
            <span className="min-w-0 lg:truncate">
                <Tip text={d.title}>
                    <Link href={d.href} className="font-semibold underline">
                        {d.label}
                    </Link>
                </Tip>
                {` ${d.action} `}
                <span className="whitespace-nowrap">in {fmtSpan(d.blocks * blockTime)}</span>
            </span>
        </div>
    )
}

/** The referenda card with the deadlines of the coming days on top, nearest first. */
export default function Upcoming({items, blockTime, className, children}: {items: Deadline[]; blockTime: number; className?: string; children: ReactNode}) {
    const [open, setOpen] = useState(false)
    const n = items.length
    if (n === 0)
        return (
            <Card size="flush" className={className}>
                {children}
            </Card>
        )
    return (
        <Collapsible open={open} onOpenChange={setOpen} asChild>
            <Card size="flush" className={cn('group/upcoming', className)}>
                <div className={cn('flex shrink-0 flex-col gap-1 p-3', CLOSED_H[closedSlots(n)], n > SHOWN && OPEN_H)}>
                    <div className="flex min-h-0 flex-col gap-1 lg:overflow-y-auto">
                        {items.slice(0, SHOWN).map(d => (
                            <Strip key={d.id} d={d} blockTime={blockTime} />
                        ))}
                        <CollapsibleContent className="flex flex-col gap-1">
                            {items.slice(SHOWN).map(d => (
                                <Strip key={d.id} d={d} blockTime={blockTime} />
                            ))}
                        </CollapsibleContent>
                    </div>
                    {n > SHOWN && (
                        <CollapsibleTrigger className="self-start px-1 text-[13px] text-primary hover:underline">
                            {open ? 'Show less' : `Show ${n - SHOWN} more`}
                        </CollapsibleTrigger>
                    )}
                </div>
                {children}
            </Card>
        </Collapsible>
    )
}
