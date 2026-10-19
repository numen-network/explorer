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

// what trails a label, drawn alike in the trigger, its hidden sizes and the list
const TAIL = {note: 'font-mono text-xs text-dim', count: 'text-xs text-dim tabular-nums'}

const tailOf = (o: {note?: string; count?: number}) => (o.note != null ? {text: o.note, cls: TAIL.note} : o.count != null ? {text: fmtInt(o.count), cls: TAIL.count} : null)

// every label with what trails it, and every label in fit, sits hidden in the
// trigger's one grid cell as generated content, so the trigger keeps the width
// of the widest row whichever is picked while its text stays the picked one
// alone. a list row spends the same room around its text as the trigger, so
// the open list is exactly as wide
export default function Dropdown<V extends string>({value, options, onChange, label, fit = [], className}: Props<V>) {
    const sizes = new Map([...options, ...fit.map(f => ({label: f, note: undefined}))].map(o => [`${o.label}|${tailOf(o)?.text ?? ''}`, {label: o.label, tail: tailOf(o)}]))
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
                                data-tail={o.tail?.text}
                                aria-hidden
                                className={cn(
                                    'invisible col-start-1 row-start-1 truncate before:content-[attr(data-fit)]',
                                    o.tail && 'after:ml-2 after:text-xs after:content-[attr(data-tail)]',
                                    o.tail?.cls === TAIL.count && 'after:tabular-nums'
                                )}
                            />
                        ))}
                        <span className="col-start-1 row-start-1 truncate">
                            {picked?.label}
                            {picked?.note != null && <span className={cn('ml-2', TAIL.note)}>{picked.note}</span>}
                        </span>
                    </span>
                </SelectValue>
            </SelectTrigger>
            <SelectContent align="start" className="min-w-0 border shadow-lg ring-0">
                {options.map(o => {
                    const tail = tailOf(o)
                    return (
                        <SelectItem key={o.value} value={o.value} textValue={o.label} className="gap-3 py-1.5 pl-3 *:[span]:last:grow *:[span]:last:gap-1.5 [&_svg]:text-primary">
                            {iconed && <IconSlot icon={o.icon} />}
                            <span className="flex grow items-center">
                                {o.label}
                                {tail && <span className={cn('ml-auto pl-2', tail.cls)}>{tail.text}</span>}
                            </span>
                        </SelectItem>
                    )
                })}
            </SelectContent>
        </Select>
    )
}
