import Link from 'next/link'

export default function NotFound() {
    return (
        <div className="card mt-6 px-6 py-12 text-center">
            <div className="text-lg font-semibold">Not found</div>
            <p className="mt-2 text-sm text-sub">Nothing lives at this address, or it is not indexed yet.</p>
            <Link href="/" className="mt-5 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-deep">
                Back home
            </Link>
        </div>
    )
}
