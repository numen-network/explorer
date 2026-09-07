'use client'
import {useEffect, useSyncExternalStore} from 'react'
import {ArrowLeftRight} from 'lucide-react'
import TimeAgo from './TimeAgo'
import {Tip} from '@/components/Tip'
import {Toggle} from '@/components/ui/toggle'
import {fmtDateTime} from '@/lib/format'

// every timestamp shows the ago | date pair, the toggle only picks the timezone
type Mode = 'utc' | 'local'
const LABEL: Record<Mode, string> = {utc: 'Age | Date (UTC)', local: 'Age | Date (Local)'}

let mode: Mode = 'utc'
let loaded = false
const subs = new Set<() => void>()
const subscribe = (f: () => void) => {
    subs.add(f)
    return () => subs.delete(f)
}
const getMode = () => mode
const serverMode = (): Mode => 'utc'
const notify = () => subs.forEach(f => f())
const setMode = (local: boolean) => {
    mode = local ? 'local' : 'utc'
    try {
        localStorage.setItem('timeMode', mode)
    } catch {}
    notify()
}
const loadPref = () => {
    if (loaded) return
    loaded = true
    try {
        if (localStorage.getItem('timeMode') === 'local') {
            mode = 'local'
            notify()
        }
    } catch {}
}

const QUIET = "h-auto min-w-0 gap-1 rounded-none p-0 text-[length:inherit] hover:bg-transparent aria-pressed:bg-transparent data-[state=on]:bg-transparent [&_svg:not([class*='size-'])]:size-[1em]"

export function TimeModeButton() {
    const m = useSyncExternalStore(subscribe, getMode, serverMode)
    useEffect(loadPref, [])
    return (
        <Tip text="Switch timezone">
            <Toggle size="sm" pressed={m === 'local'} onPressedChange={setMode} aria-label="Switch timezone" className={`${QUIET} font-medium text-primary hover:text-primary hover:underline data-[state=on]:text-primary`}>
                {LABEL[m]}
                <ArrowLeftRight />
            </Toggle>
        </Tip>
    )
}

// table cells sit under a TimeModeButton header that already names the
// timezone, standalone rows carry the suffix themselves
export function TimeCell({iso, cycle = false}: {iso: string; cycle?: boolean}) {
    const m = useSyncExternalStore(subscribe, getMode, serverMode)
    useEffect(loadPref, [])
    const body = (
        <span className="whitespace-nowrap">
            <TimeAgo iso={iso} /> <span className="text-dim">|</span>{' '}
            <span suppressHydrationWarning>
                {fmtDateTime(iso, m === 'utc')}
                {cycle ? ` (${m === 'utc' ? 'UTC' : 'Local'})` : ''}
            </span>
        </span>
    )
    if (!cycle) return body
    return (
        <span className="inline-flex items-center gap-1.5">
            {body}
            <Tip text="Switch timezone">
                <Toggle size="sm" pressed={m === 'local'} onPressedChange={setMode} aria-label="Switch timezone" className={`${QUIET} text-dim hover:text-primary data-[state=on]:text-dim`}>
                    <ArrowLeftRight />
                </Toggle>
            </Tip>
        </span>
    )
}
