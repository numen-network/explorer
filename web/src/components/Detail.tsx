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
            <div className="min-w-0 flex-1 font-mono wrap-anywhere">{children}</div>
        </div>
    )
}

// amounts share one column and sit flush right in it, so the decimal points
// line up. A share goes after the amount, or after the label on a phone
export function AmountRows({children}: {children: ReactNode}) {
    return (
        <div className="grid grid-cols-[1.25rem_fit-content(calc(100%_-_2.5rem))_1fr] divide-y sm:grid-cols-[1.25rem_11rem_fit-content(calc(100%_-_17rem))_auto_1fr]">
            {children}
        </div>
    )
}

// rows read as one unit, no rule between them
export function AmountGroup({children}: {children: ReactNode}) {
    return <div className="col-span-full grid grid-cols-subgrid py-1.5 *:py-1">{children}</div>
}

const MARK = {good: 'before:bg-good', dim: 'before:bg-dim'}

export function AmountRow({label, mark, share, children}: {label: string; mark?: keyof typeof MARK; share?: string; children: ReactNode}) {
    const pct = share && <span className="ml-2 text-xs text-muted-foreground">{share}</span>
    return (
        <div className="col-span-full grid grid-cols-subgrid items-baseline gap-y-0.5 py-2.5 text-sm">
            <div data-slot="amount-label" className="col-[2/-1] text-muted-foreground sm:col-[2/3] sm:pr-4">
                <span className={mark && `before:mr-2 before:inline-block before:size-2 before:rounded-full before:align-[1px] ${MARK[mark]}`}>{label}</span>
                {pct && <span className="sm:hidden">{pct}</span>}
            </div>
            <div className="col-start-2 row-start-2 min-w-0 text-right font-mono wrap-anywhere sm:col-start-3 sm:row-start-1">{children}</div>
            {pct && <div data-slot="share" className="hidden sm:col-start-4 sm:block">{pct}</div>}
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
