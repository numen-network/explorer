'use client'
import {useRouter} from 'next/navigation'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {fmtInt} from '@/lib/format'

interface LinkOption {
    label: string
    count?: number
    href: string
}

interface Props {
    label: string
    options: LinkOption[]
    value: string
    fit?: string[]
}

// a select whose options are links, value is the href of the one picked. every
// label, and every one in fit, sits hidden in the trigger's one grid cell, so
// the trigger keeps the width of the longest whichever is picked
export default function LinkSelect({label, options, value, fit = []}: Props) {
    const router = useRouter()
    const labels = new Set([...options.map(o => o.label), ...fit])
    return (
        <Select value={value} onValueChange={href => router.push(href, {scroll: false})}>
            <SelectTrigger aria-label={label} className="h-auto max-w-full gap-2 rounded-lg bg-card py-1 pr-2 pl-2.5 text-xs hover:bg-background data-[size=default]:h-auto [&_svg]:size-3.5">
                <SelectValue>
                    <span className="grid min-w-0 text-left">
                        {[...labels].map(text => (
                            <span key={text} aria-hidden className="invisible col-start-1 row-start-1 truncate">
                                {text}
                            </span>
                        ))}
                        <span className="col-start-1 row-start-1 truncate">{options.find(o => o.href === value)?.label}</span>
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent position="popper" align="start" className="border shadow-lg ring-0">
                {options.map(o => (
                    <SelectItem key={o.href} value={o.href} textValue={o.label} className="gap-3 py-1.5 pl-3 *:[span]:last:grow [&_svg]:text-primary">
                        {o.label}
                        {o.count != null && <span className="ml-auto pl-5 text-xs text-dim tabular-nums">{fmtInt(o.count)}</span>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
