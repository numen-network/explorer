'use client'
import {useRouter} from 'next/navigation'
import {useEffect, useRef} from 'react'
import {useHeads} from '@/components/blockStatus'
import type {Heads} from '@/lib/chain'

// renders the page again once the indexer has gone past the head it was rendered at
export default function Refresh({ms}: {ms: number}) {
    const router = useRouter()
    const {indexed} = useHeads()
    const asked = useRef(indexed)
    useEffect(() => {
        const t = setInterval(async () => {
            if (document.hidden) return
            const res = await fetch('/api/heads', {cache: 'no-store'}).catch(() => null)
            if (!res?.ok) return
            const polled: Heads = await res.json()
            if (polled.indexed <= Math.max(indexed, asked.current)) return
            asked.current = polled.indexed
            router.refresh()
        }, ms)
        return () => clearInterval(t)
    }, [router, indexed, ms])
    return null
}
