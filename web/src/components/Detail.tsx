import {ReactNode} from 'react'
import {Card} from '@/components/ui/card'

export const NONE = <span className="text-dim">—</span>
export const SELF = <span className="text-dim">self</span>

export function DetailCard({title, children}: {title?: string; children: ReactNode}) {
    return (
        <Card size="flush" className="divide-y">
            {title && <div className="px-5 py-2.5 text-sm font-semibold">{title}</div>}
            {children}
        </Card>
    )
}

// a 40 rem label column plus a 64 character hash does not fit a phone, so the
// label sits above the value until there is room beside it
export function DetailRow({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex flex-col gap-0.5 px-5 py-2.5 text-sm sm:flex-row sm:gap-4">
            <div className="shrink-0 text-muted-foreground sm:w-40">{label}</div>
            <div className="min-w-0 font-mono break-all">{children}</div>
        </div>
    )
}

export function JsonBlock({value}: {value: unknown}) {
    if (value === null || value === undefined) return NONE
    return (
        <pre className="max-h-72 overflow-auto rounded-lg border bg-background px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
        </pre>
    )
}
