'use client'
import {useEffect, useState} from 'react'

function label(iso: string): string {
    const s = Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 1000))
    if (s < 60) return `${s}s ago`
    if (s < 3600) return `${Math.floor(s / 60)}m ago`
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`
    return `${Math.floor(s / 86400)}d ago`
}

export default function TimeAgo({iso}: {iso: string}) {
    const [text, setText] = useState(() => label(iso))
    useEffect(() => {
        setText(label(iso))
        const t = setInterval(() => setText(label(iso)), 5000)
        return () => clearInterval(t)
    }, [iso])
    return <span suppressHydrationWarning>{text}</span>
}
