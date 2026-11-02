'use client'

import {useEffect, useState} from 'react'
import {Alert, AlertDescription} from '@/components/ui/alert'
import type {Heads} from '@/lib/chain'
import {fmtCount, fmtInt} from '@/lib/format'
import {isBehind} from '@/lib/indexing'

// the chain head comes from the same row the processor writes, so a dead
// processor freezes both numbers and only the age of the newest block moves
const STALL_FACTOR = 10
const STALL_FLOOR = 120
const TICK_MS = 5000

// the stall in one unit spelled out and cut rather than rounded, each unit
// kept until two of the next one have passed
function since(seconds: number): string {
    if (seconds < 120) return fmtCount(Math.floor(seconds), 'second')
    if (seconds < 7200) return fmtCount(Math.floor(seconds / 60), 'minute')
    if (seconds < 172800) return fmtCount(Math.floor(seconds / 3600), 'hour')
    return fmtCount(Math.floor(seconds / 86400), 'day')
}

function warning(heads: Heads, blockTime: number, now: number): string | null {
    if (isBehind(heads)) return `Indexer is ${fmtCount(heads.best - heads.indexed, 'block')} behind the chain head at #${fmtInt(heads.best)}.`
    if (heads.indexedAt == null) return null
    const age = (now - Date.parse(heads.indexedAt)) / 1000
    const stall = Math.max(STALL_FLOOR, blockTime * STALL_FACTOR)
    return age > stall ? `No new block indexed for ${since(age)}. The chain or the indexer has stopped.` : null
}

// the layout renders once per visit. the banner polls the heads and runs its own clock
export default function IndexerBanner({rendered, renderedAt, blockTime}: {rendered: Heads; renderedAt: number; blockTime: number}) {
    const [heads, setHeads] = useState(rendered)
    const [now, setNow] = useState(renderedAt)
    useEffect(() => {
        const poll = setInterval(async () => {
            if (document.hidden) return
            const res = await fetch('/api/heads', {cache: 'no-store'}).catch(() => null)
            if (res?.ok) setHeads(await res.json())
        }, blockTime * 1000)
        const tick = setInterval(() => setNow(Date.now()), TICK_MS)
        return () => {
            clearInterval(poll)
            clearInterval(tick)
        }
    }, [blockTime])
    const text = warning(heads, blockTime, now)
    if (!text) return null
    return (
        <Alert className="mt-4 border-warn/40 bg-warn/10 px-4 py-2">
            <AlertDescription className="text-wrap text-foreground md:text-wrap">{text}</AlertDescription>
        </Alert>
    )
}
