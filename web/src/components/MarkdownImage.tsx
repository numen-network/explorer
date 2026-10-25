'use client'

import {useState} from 'react'
import {https} from '@/lib/url'

/** Falls back to a link when the address isn't an https image the browser can draw. */
export default function MarkdownImage({src, alt}: {src: string | undefined; alt: string | undefined}) {
    const [broken, setBroken] = useState(false)
    const href = https(src)
    if (href && !broken)
        return (
            <img
                src={href}
                alt={alt ?? ''}
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={() => setBroken(true)}
                // a server-rendered image can fail before hydration, when nothing listens yet
                ref={img => {
                    if (img?.complete && img.naturalWidth === 0) setBroken(true)
                }}
            />
        )
    return (
        <a href={src} target="_blank" rel="noopener noreferrer">
            {alt || src}
        </a>
    )
}
