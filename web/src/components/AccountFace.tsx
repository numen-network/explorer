'use client'

import {useEffect, useState} from 'react'
import {create} from 'zustand'
import {persist} from 'zustand/middleware'
import {cn} from 'cn'
import Identicon from '@/components/Identicon'
import {Tip} from '@/components/Tip'
import {infoField} from '@/lib/identity'
import {https} from '@/lib/url'

// the badge sits 42% wide off the bottom right corner, the face under it is
// cut away 2px wider so the gap shows whatever surface the face sits on
const NOTCH = {maskImage: 'radial-gradient(circle at calc(79cqw + 3px) calc(79cqw + 3px), transparent calc(21cqw + 2px), #000 calc(21cqw + 2.5px))'}

// one order for every face on the site, kept across visits. the server renders
// the avatar first, so the stored order only loads once the page is mounted
export const useFaceOrder = create<{identicon: boolean; swap: () => void}>()(
    persist(set => ({identicon: false, swap: () => set(s => ({identicon: !s.identicon}))}), {
        name: 'faceOrder',
        partialize: s => ({identicon: s.identicon}),
        skipHydration: true,
    })
)

/**
 * The avatar an identity put on chain with the identicon of the key in a
 * badge, a click swaps the two on every face. With no https avatar, or one
 * that fails to load, only the identicon shows.
 */
export default function AccountFace({hex, json, className}: {hex: string; json: unknown; className?: string}) {
    const [broken, setBroken] = useState(false)
    const identicon = useFaceOrder(s => s.identicon)
    const swap = useFaceOrder(s => s.swap)
    useEffect(() => void useFaceOrder.persist.rehydrate(), [])
    const src = https(infoField(json, 'avatar'))
    if (!src || broken) return <Identicon hex={hex} className={className} />
    // an image that failed before hydration never fires onError, so the ref checks it too
    const picture = (
        <img
            src={src}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            ref={img => {
                if (img?.complete && img.naturalWidth === 0) setBroken(true)
            }}
            onError={() => setBroken(true)}
            className="size-full rounded-full bg-muted object-cover"
        />
    )
    const icon = <Identicon hex={hex} className="size-full" />
    const [face, badge] = identicon ? [icon, picture] : [picture, icon]
    const label = identicon ? 'Show avatar' : 'Show identicon'
    return (
        <Tip text={label}>
            <button type="button" aria-label={label} onClick={swap} className={cn('@container relative shrink-0 cursor-pointer rounded-full outline-none focus-visible:ring-3 focus-visible:ring-ring/50', className)}>
                <span className="flex size-full" style={NOTCH}>
                    {face}
                </span>
                <span className="absolute -right-0.75 -bottom-0.75 flex size-[42%]">{badge}</span>
            </button>
        </Tip>
    )
}
