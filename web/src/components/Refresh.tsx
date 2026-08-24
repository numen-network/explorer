'use client'
import {useRouter} from 'next/navigation'
import {useEffect} from 'react'

export default function Refresh({ms = 12000}: {ms?: number}) {
    const router = useRouter()
    useEffect(() => {
        const t = setInterval(() => {
            if (!document.hidden) router.refresh()
        }, ms)
        return () => clearInterval(t)
    }, [router, ms])
    return null
}
