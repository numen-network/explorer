'use client'
import type {ReactNode} from 'react'
import {cn} from 'cn'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {fmtInt} from '@/lib/format'

export interface DropdownOption<V extends string> {
    value: V
    label: string
    count?: number
    icon?: ReactNode
    // a second label shown dimmed after the first
    note?: string
}

interface Props<V extends string> {
    value: V
    options: DropdownOption<V>[]
    onChange: (value: V) => void
    label?: string
    fit?: string[]
    className?: string
}

// one square per option once any option has an icon, empty where it has none,
// so the labels still line up
function IconSlot({icon}: {icon: ReactNode}) {
    return <span className="inline-flex size-4 shrink-0 items-center justify-center [&_img]:m-0 [&_img]:size-4">{icon}</span>
}

// the note after the picked label, its hidden sizes drawn the same way
const NOTE = 'ml-2 font-mono text-xs text-dim'

// every label with its note, and every label in fit, sits hidden in the
// trigger's one grid cell as generated content, so the trigger keeps the width
// of the longest whichever is picked while its text stays the picked one alone
export default function Dropdown<V extends string>({value, options, onChange, label, fit = [], className}: Props<V>) {
    const sizes = new Map([...options, ...fit.map(f => ({label: f, note: undefined}))].map(o => [`${o.label}|${o.note ?? ''}`, o]))
    const iconed = options.some(o => o.icon != null)
    const picked = options.find(o => o.value === value)
    return (
        <Select value={value} onValueChange={v => onChange(v as V)}>
            <SelectTrigger aria-label={label} className={cn('max-w-full gap-2 bg-card pr-2.5 pl-3 hover:bg-background [&_svg]:size-3.5', className)}>
                <SelectValue>
                    {iconed && <IconSlot icon={picked?.icon} />}
                    <span className="grid min-w-0 text-left">
                        {[...sizes].map(([key, o]) => (
                            <span
                                key={key}
                                data-fit={o.label}
                                data-note={o.note}
                                aria-hidden
                                className={cn('invisible col-start-1 row-start-1 truncate before:content-[attr(data-fit)]', o.note != null && 'after:ml-2 after:font-mono after:text-xs after:content-[attr(data-note)]')}
                            />
                        ))}
                        <span className="col-start-1 row-start-1 truncate">
                            {picked?.label}
                            {picked?.note != null && <span className={NOTE}>{picked.note}</span>}
                        </span>
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="border shadow-lg ring-0">
                {options.map(o => (
                    <SelectItem key={o.value} value={o.value} textValue={o.label} className="gap-3 py-1.5 pl-3 *:[span]:last:grow [&_svg]:text-primary">
                        {iconed && <IconSlot icon={o.icon} />}
                        {o.label}
                        {o.note != null && <span className="ml-auto pl-5 font-mono text-xs text-dim">{o.note}</span>}
                        {o.count != null && <span className="ml-auto pl-5 text-xs text-dim tabular-nums">{fmtInt(o.count)}</span>}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
