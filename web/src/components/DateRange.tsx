'use client'

import {useState} from 'react'
import {Calendar as CalendarIcon} from 'lucide-react'
import type {DateRange as Range} from 'react-day-picker'
import {Button} from '@/components/ui/button'
import {Calendar} from '@/components/ui/calendar'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'

const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// a day string is a wall date, utc parsing would shift it a day back in western zones
const parse = (s: string) => (s ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : undefined)

const toRange = (after: string, before: string): Range | undefined => {
    const from = parse(after)
    const to = parse(before)
    return from || to ? {from, to} : undefined
}

// the parent keys this on the url, so a submit back to the same route mounts
// a fresh draft. lastDay is the utc day of the newest indexed block, the last
// day a filter can find anything on, null while only genesis is indexed
export default function DateRange({after, before, lastDay, active = false}: {after: string; before: string; lastDay: string | null; active?: boolean}) {
    const [range, setRange] = useState(() => toRange(after, before))

    const from = range?.from ? day(range.from) : ''
    const to = range?.to ? day(range.to) : ''
    if (lastDay == null) return null
    const today = parse(lastDay)!

    return (
        <>
            <input type="hidden" name="after" value={from} />
            <input type="hidden" name="before" value={to} />
            <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        data-active={active}
                        className="w-56 justify-between gap-2 rounded-lg bg-card px-3 font-normal hover:bg-card hover:text-primary aria-expanded:bg-card aria-expanded:text-foreground data-active:bg-background data-active:font-medium data-active:hover:bg-background data-active:aria-expanded:bg-background"
                    >
                        {from || to ? (
                            <span>
                                {from || '…'} <span className="text-dim">to</span> {to || '…'}
                            </span>
                        ) : (
                            <span className="text-muted-foreground">Any date</span>
                        )}
                        <CalendarIcon className="size-3.5 text-muted-foreground" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto border p-0 leading-normal shadow-lg ring-0">
                    <Calendar
                        mode="range"
                        selected={range}
                        onSelect={setRange}
                        captionLayout="dropdown"
                        defaultMonth={range?.from ?? today}
                        startMonth={new Date(today.getFullYear() - 10, 0)}
                        endMonth={today}
                        disabled={{after: today}}
                    />
                </PopoverContent>
            </Popover>
        </>
    )
}
