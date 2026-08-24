'use client'
import {useRouter} from 'next/navigation'
import {useState} from 'react'

export default function SearchBar() {
    const router = useRouter()
    const [q, setQ] = useState('')
    return (
        <form
            className="card flex items-stretch overflow-hidden !rounded-lg"
            onSubmit={e => {
                e.preventDefault()
                const s = q.trim()
                if (s) router.push(`/search?q=${encodeURIComponent(s)}`)
            }}
        >
            <svg className="ml-4 self-center text-faint" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10.5 10.5 L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search by block height / extrinsic / hash / account / EVM address / identity / token"
                className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-faint"
            />
            <button className="w-28 shrink-0 bg-accent text-sm font-medium text-white hover:bg-accent-deep">Search</button>
        </form>
    )
}
