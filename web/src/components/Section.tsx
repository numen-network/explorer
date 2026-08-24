import Link from 'next/link'
import {ReactNode} from 'react'
import {Jump} from '@/components/links'

interface Props {
    title: string
    more?: string
    moreLabel?: string
    children: ReactNode
}

export default function Section({title, more, moreLabel = 'View all', children}: Props) {
    return (
        <section className="mt-7">
            <div className="mb-3 flex items-baseline justify-between gap-4">
                <h2 className="text-[17px] font-semibold whitespace-nowrap">{title}</h2>
                {more && (
                    <Link href={more} className="text-sm whitespace-nowrap text-accent hover:underline">
                        {moreLabel} <Jump />
                    </Link>
                )}
            </div>
            {children}
        </section>
    )
}
