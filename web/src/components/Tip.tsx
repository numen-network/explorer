'use client'

import {useCallback, useId, useState, useSyncExternalStore, type ComponentProps, type ReactElement, type ReactNode} from 'react'
import {Popover as PopoverPrimitive} from '@base-ui/react/popover'
import {cn} from 'cn'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {Tooltip, TooltipContent, TooltipTrigger} from '@/components/ui/tooltip'

const TOUCH = '(hover: none)'

// a tap on these does what they are for, so the tip stays on focus as it was
const INTERACTIVE = 'a[href], button, input, select, textarea, [role=button]'

const subscribe = (change: () => void) => {
    const query = matchMedia(TOUCH)
    query.addEventListener('change', change)
    return () => query.removeEventListener('change', change)
}

const useTouch = () => useSyncExternalStore(subscribe, () => matchMedia(TOUCH).matches, () => false)

const WIDTH = 'wrap-anywhere sm:min-w-min sm:wrap-normal'

/**
 * Hover text for the thing inside, and nothing at all when there is none to
 * show. Nothing that opens a portal goes inside, since React bubbles the
 * portal's pointer events up through here and they read as hovering.
 * A hash or an address can't wrap, so the box widens to fit it on one line.
 * On a narrow screen it breaks at any character instead. A touch screen has
 * no hover, so there a tap opens the text on anything that does nothing else.
 */
export function Tip({text, children, className, sideOffset = 10, ...props}: {text: ReactNode; children: ReactElement | null | false} & Omit<ComponentProps<typeof TooltipContent>, 'children'>) {
    const touch = useTouch()
    const id = useId()
    const [open, setOpen] = useState(false)
    const [plain, setPlain] = useState(false)
    const measure = useCallback((el: HTMLElement | null) => {
        if (el) setPlain(!el.matches(INTERACTIVE))
    }, [])
    if (!text) return children
    if (!children) return null
    if (touch && plain)
        return (
            <Popover>
                <PopoverTrigger nativeButton={false} render={children} />
                <PopoverContent
                    side={props.side}
                    align={props.align}
                    sideOffset={sideOffset}
                    collisionPadding={8}
                    className={cn('w-fit max-w-xs flex-row items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-none ring-0', WIDTH, className)}
                >
                    {text}
                    <PopoverPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
                </PopoverContent>
            </Popover>
        )
    return (
        <Tooltip open={open} onOpenChange={setOpen}>
            <TooltipTrigger ref={measure} aria-describedby={open ? id : undefined} render={children} />
            <TooltipContent id={id} role="tooltip" sideOffset={sideOffset} className={cn(WIDTH, className)} {...props}>
                {text}
            </TooltipContent>
        </Tooltip>
    )
}
