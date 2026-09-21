'use client'

import type {ComponentProps, ReactNode} from 'react'
import {cn} from 'cn'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'

/**
 * Hover text for the thing inside, and nothing at all when there is none to
 * show. Nothing that opens a portal goes inside, since React bubbles the
 * portal's pointer events up through here and Radix reads them as hovering.
 * A hash or an address can't wrap, so the box widens to fit it on one line.
 * On a narrow screen it breaks at any character instead.
 */
export function Tip({text, children, className, ...props}: {text: ReactNode; children: ReactNode} & Omit<ComponentProps<typeof TooltipContent>, 'children'>) {
    if (!text) return children
    return (
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent className={cn('wrap-anywhere sm:min-w-min sm:wrap-normal', className)} {...props}>
                {text}
            </TooltipContent>
        </Tooltip>
    )
}
