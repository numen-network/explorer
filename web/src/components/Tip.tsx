'use client'

import {useState, useSyncExternalStore, type ComponentProps, type ReactNode} from 'react'
import {cn} from 'cn'
import {Popover as PopoverPrimitive} from 'radix-ui'
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
 * portal's pointer events up through here and Radix reads them as hovering.
 * A hash or an address can't wrap, so the box widens to fit it on one line.
 * On a narrow screen it breaks at any character instead. A touch screen has
 * no hover, so there a tap opens the text on anything that does nothing else.
 */
export function Tip({text, children, className, ...props}: {text: ReactNode; children: ReactNode} & Omit<ComponentProps<typeof TooltipContent>, 'children'>) {
    const touch = useTouch()
    const [trigger, setTrigger] = useState<HTMLElement | null>(null)
    if (!text) return children
    if (touch && trigger && !trigger.matches(INTERACTIVE))
        return (
            <PopoverPrimitive.Root>
                <PopoverPrimitive.Trigger asChild ref={setTrigger}>
                    {children}
                </PopoverPrimitive.Trigger>
                <PopoverPrimitive.Portal>
                    <PopoverPrimitive.Content
                        side={props.side}
                        align={props.align}
                        sideOffset={props.sideOffset}
                        collisionPadding={8}
                        className={cn('z-50 inline-flex w-fit max-w-xs items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background outline-hidden', WIDTH, className)}
                    >
                        {text}
                        <PopoverPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground" />
                    </PopoverPrimitive.Content>
                </PopoverPrimitive.Portal>
            </PopoverPrimitive.Root>
        )
    return (
        <Tooltip>
            <TooltipTrigger asChild ref={setTrigger}>
                {children}
            </TooltipTrigger>
            <TooltipContent className={cn(WIDTH, className)} {...props}>
                {text}
            </TooltipContent>
        </Tooltip>
    )
}
