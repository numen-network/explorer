'use client'

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
    return (
        <div className="card mt-6 px-6 py-12 text-center">
            <div className="text-lg font-semibold">Something broke</div>
            <p className="mt-2 text-sm text-sub">
                Data source unreachable or the query failed.
                {error.digest && <span className="font-mono"> · {error.digest}</span>}
            </p>
            <button onClick={reset} className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep">
                Retry
            </button>
        </div>
    )
}
