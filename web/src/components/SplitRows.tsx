import type {ReactNode} from 'react'
import {Card} from '@/components/ui/card'

// rows never shrink below their widest part, so the card scrolls sideways instead
export function SplitRows({children}: {children: ReactNode}) {
    return (
        <Card size="flush">
            <div className="overflow-x-auto">
                <div className="min-w-min divide-y whitespace-nowrap">{children}</div>
            </div>
        </Card>
    )
}

export function SplitRow({lead, children}: {lead: ReactNode; children: ReactNode}) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-5 py-2.5 text-sm">
            <div className="flex items-center gap-3">{lead}</div>
            <div className="flex items-center gap-3">{children}</div>
        </div>
    )
}
