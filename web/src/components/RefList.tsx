'use client'

import Link from 'next/link'
import {ChevronDown} from 'lucide-react'
import {NumberedLink} from '@/components/links'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'

const SHOWN = 2

/** Referenda as links, the first few inline and all of them with titles behind the arrow. Clicks stop here, it sits in rows that expand. */
export default function RefList({refs}: {refs: {index: number; title: string | null; href: string}[]}) {
    if (refs.length === 0) return '—'
    const hidden = refs.length - SHOWN
    return (
        <span className="inline-flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
            <Popover>
                {refs.slice(0, SHOWN).map(r => (
                    <PopoverTrigger key={r.href} openOnHover delay={100} closeDelay={150} nativeButton={false} render={props => <Link {...props} role={undefined} href={r.href} className="font-mono text-primary hover:underline" />}>
                        #{r.index}
                    </PopoverTrigger>
                ))}
                {hidden > 0 && <span className="font-mono text-xs text-muted-foreground">+{hidden}</span>}
                <PopoverTrigger openOnHover delay={100} closeDelay={150} aria-label="All referenda" className="inline-flex size-5 items-center justify-center rounded-md border bg-background text-muted-foreground hover:text-foreground">
                    <ChevronDown className="size-3" />
                </PopoverTrigger>
                <PopoverContent align="start" collisionPadding={16} className="max-h-[50vh] w-max max-w-[min(32rem,var(--available-width))] gap-1 overflow-y-auto p-3 text-[13px] wrap-anywhere">
                    {refs.map(r => (
                        <NumberedLink key={r.href} {...r} />
                    ))}
                </PopoverContent>
            </Popover>
        </span>
    )
}
