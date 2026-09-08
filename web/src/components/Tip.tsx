'use client'

import type {ReactNode} from 'react'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'

/**
 * Hover text for the thing inside, and nothing at all when there is none to
 * show. Nothing that opens a portal goes inside, since React bubbles the
 * portal's pointer events up through here and Radix reads them as hovering.
 */
export function Tip({text, children}: {text: ReactNode; children: ReactNode}) {
    if (!text) return children
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>{text}</TooltipContent>
        </Tooltip>
    )
}
