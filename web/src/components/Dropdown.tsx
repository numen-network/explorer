'use client'
import {cn} from 'cn'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {fmtInt} from '@/lib/format'

export interface DropdownOption<V extends string> {
    value: V
    label: string
    count?: number
}

interface Props<V extends string> {
    value: V
    options: DropdownOption<V>[]
    onChange: (value: V) => void
    label?: string
    fit?: string[]
    className?: string
}

// every label, and every one in fit, sits hidden in the trigger's one grid
// cell as generated content, so the trigger keeps the width of the longest
// whichever is picked while its text stays the picked label alone
export default function Dropdown<V extends string>({value, options, onChange, label, fit = [], className}: Props<V>) {
    const labels = new Set([...options.map(o => o.label), ...fit])
    return (
        <Select value={value} onValueChange={v => onChange(v as V)}>
            <SelectTrigger aria-label={label} className={cn('max-w-full gap-2 bg-card pr-2.5 pl-3 hover:bg-background [&_svg]:size-3.5', className)}>
                <SelectValue>
                    <span className="grid min-w-0 text-left">
                        {[...labels].map(text => (
                            <span key={text} data-fit={text} aria-hidden className="invisible col-start-1 row-start-1 truncate before:content-[attr(data-fit)]" />
                        ))}
                        <span className="col-start-1 row-start-1 truncate">{options.find(o => o.value === value)?.label}</span>
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="border shadow-lg ring-0">
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} textValue={o.label} className="gap-3 py-1.5 pl-3 *:[span]:last:grow [&_svg]:text-primary">
                        {o.label}
                        {o.count != null && <span className="ml-auto pl-5 text-xs text-dim tabular-nums">{fmtInt(o.count)}</span>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
