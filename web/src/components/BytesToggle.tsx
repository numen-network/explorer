import {ChevronRight} from 'lucide-react'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import {fmtCount} from '@/lib/format'

export default function BytesToggle({hex, lead}: {hex: string; lead?: string}) {
    const size = fmtCount((hex.length - 2) / 2, 'byte')
    return (
        <Collapsible className="group">
            <CollapsibleTrigger className="flex cursor-pointer items-center gap-1.5">
                <ChevronRight className="size-3.5 text-dim transition-transform group-data-[state=open]:rotate-90" />
                {lead ? `${lead} · ${size}` : size}
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 max-h-48 overflow-y-auto rounded-lg border bg-background px-3 py-2 text-xs break-all text-muted-foreground">{hex}</CollapsibleContent>
        </Collapsible>
    )
}
