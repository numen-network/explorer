'use client'
import {useState} from 'react'

export default function CopyBtn({text}: {text: string}) {
    const [ok, setOk] = useState(false)
    return (
        <button
            aria-label="copy"
            onClick={() => {
                navigator.clipboard.writeText(text).then(() => {
                    setOk(true)
                    setTimeout(() => setOk(false), 1200)
                })
            }}
            className="ml-1.5 inline-grid size-5 place-items-center rounded border border-edge bg-card align-middle text-faint hover:text-accent"
        >
            {ok ? (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1.5 5.5 4 8 8.5 2.5" stroke="var(--color-pos)" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            ) : (
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <rect x="3" y="3" width="6" height="6" rx="1" stroke="currentColor" />
                    <path d="M7 3V2a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1" stroke="currentColor" />
                </svg>
            )}
        </button>
    )
}
