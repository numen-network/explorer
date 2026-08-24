'use client'

import {ICON} from '@/lib/icons'
import {channelHref, identityChannels} from '@/lib/identity'

// the cell sits inside a summary, so a click on a link must not also toggle the row
export default function Socials({json}: {json: unknown}) {
    return (
        <span className="flex items-center gap-2 text-faint">
            {identityChannels(json).map(c => {
                const icon = (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-label={c.label}>
                        <title>{`${c.label} ${c.value}`}</title>
                        <path d={ICON[c.key]} />
                    </svg>
                )
                const href = channelHref(c.key, c.value)
                if (!href) return <span key={c.key}>{icon}</span>
                return (
                    <a key={c.key} href={href} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="hover:text-accent">
                        {icon}
                    </a>
                )
            })}
        </span>
    )
}
