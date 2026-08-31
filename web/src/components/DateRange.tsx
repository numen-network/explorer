'use client'

import {useState} from 'react'
import type {DateRange as Range} from 'react-day-picker'
import {Calendar} from '@/components/ui/calendar'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {FIELD} from '@/lib/ui'

const pad = (n: number) => String(n).padStart(2, '0')
const day = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// a day string is a wall date, utc parsing would shift it a day back in western zones
const parse = (s: string) => (s ? new Date(Number(s.slice(0, 4)), Number(s.slice(5, 7)) - 1, Number(s.slice(8, 10))) : undefined)

const toRange = (after: string, before: string): Range | undefined => {
    const from = parse(after)
    const to = parse(before)
    return from || to ? {from, to} : undefined
}

export default function DateRange({after, before}: {after: string; before: string}) {
    const url = `${after}|${before}`
    const [applied, setApplied] = useState(url)
    const [range, setRange] = useState(() => toRange(after, before))

    // react keeps this instance across a submit back to the same route, so the
    // draft has to follow the url
    if (applied !== url) {
        setApplied(url)
        setRange(toRange(after, before))
    }

    const from = range?.from ? day(range.from) : ''
    const to = range?.to ? day(range.to) : ''
    const today = new Date()

    return (
        <>
            <input type="hidden" name="after" value={from} />
            <input type="hidden" name="before" value={to} />
            <Popover>
                <PopoverTrigger className={`${FIELD} flex w-56 items-center justify-between gap-2 hover:text-accent`}>
                    {from || to ? (
                        <span>
                            {from || '…'} <span className="text-faint">to</span> {to || '…'}
                        </span>
                    ) : (
                        <span className="text-sub">Any date</span>
                    )}
                    {/* calendar geometry is a lucide icon under ISC, inlined */}
                    <svg className="text-sub" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M8 2v4" />
                        <path d="M16 2v4" />
                        <rect width="18" height="18" x="3" y="4" rx="2" />
                        <path d="M3 10h18" />
                    </svg>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
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
