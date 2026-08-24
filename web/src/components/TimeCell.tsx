'use client'
import {useEffect, useSyncExternalStore} from 'react'
import TimeAgo from './TimeAgo'
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
const cycleMode = () => {
    mode = mode === 'utc' ? 'local' : 'utc'
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

function CycleIcon() {
    return (
        <svg width="1em" height="1em" viewBox="0 0 24 24" className="shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M15.5 9.3h-7m0 0 2.2-2.2M8.5 9.3l2.2 2.2" />
            <path d="M8.5 14.7h7m0 0-2.2-2.2m2.2 2.2-2.2 2.2" />
        </svg>
    )
}

export function TimeModeButton() {
    const m = useSyncExternalStore(subscribe, getMode, serverMode)
    useEffect(loadPref, [])
    return (
        <button onClick={cycleMode} title="Switch timezone" className="inline-flex items-center gap-1 font-medium whitespace-nowrap text-accent hover:underline">
            {LABEL[m]}
            <CycleIcon />
        </button>
    )
}

// table cells sit under a TimeModeButton header that already names the
// timezone, standalone rows carry the suffix themselves
export function TimeCell({iso, cycle = false}: {iso: string; cycle?: boolean}) {
    const m = useSyncExternalStore(subscribe, getMode, serverMode)
    useEffect(loadPref, [])
    const body = (
        <span className="whitespace-nowrap">
            <TimeAgo iso={iso} /> <span className="text-faint">|</span>{' '}
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
            <button aria-label="switch timezone" title="Switch timezone" onClick={cycleMode} className="text-faint hover:text-accent">
                <CycleIcon />
            </button>
        </span>
    )
}
