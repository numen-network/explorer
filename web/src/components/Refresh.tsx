'use client'
import {useRouter} from 'next/navigation'
import {useEffect, useState} from 'react'
import {usePolledAhead} from '@/components/blockStatus'

export default function Refresh() {
    const router = useRouter()
    const ahead = usePolledAhead()
    // the page just rendered, so a height already ahead on arrival is nothing new
    const [onArrival] = useState(ahead)
    useEffect(() => {
        if (ahead !== null && ahead !== onArrival) router.refresh()
    }, [router, ahead, onArrival])
    return null
}
