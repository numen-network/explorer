import {ReactNode} from 'react'

export function DetailCard({title, children}: {title?: string; children: ReactNode}) {
    return (
        <div className="card divide-y divide-edge">
            {title && <div className="px-5 py-2.5 text-sm font-semibold">{title}</div>}
            {children}
        </div>
    )
}

// a 40 rem label column plus a 64 character hash does not fit a phone, so the
// label sits above the value until there is room beside it
export function DetailRow({label, children}: {label: string; children: ReactNode}) {
    return (
        <div className="flex flex-col gap-0.5 px-5 py-2.5 text-sm sm:flex-row sm:gap-4">
            <div className="shrink-0 text-sub sm:w-40">{label}</div>
            <div className="min-w-0 font-mono break-all">{children}</div>
        </div>
    )
}

export function JsonBlock({value}: {value: unknown}) {
    if (value === null || value === undefined) return <span className="text-faint">—</span>
    return (
        <pre className="max-h-72 overflow-auto rounded-lg border border-edge bg-bg px-3 py-2 font-mono text-xs leading-5 whitespace-pre-wrap">
            {JSON.stringify(value, null, 2)}
        </pre>
    )
}
