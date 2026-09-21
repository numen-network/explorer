'use client'

import {useTokenIcon} from '@/components/wellKnown'

export default function TokenIcon({addr}: {addr: string}) {
    const src = useTokenIcon(addr)
    return src ? <img src={src} alt="" className="mr-[0.35em] inline size-[1.2em] shrink-0 align-[-0.25em]" /> : null
}
