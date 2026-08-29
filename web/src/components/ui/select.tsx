'use client'

import * as React from 'react'
import {Select as SelectPrimitive} from 'radix-ui'
import {cn} from '@/lib/utils'

// chevron and check geometry are lucide icons under ISC, inlined
function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
    return <SelectPrimitive.Root {...props} />
}

function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
    return <SelectPrimitive.Value {...props} />
}

function SelectTrigger({className, children, ...props}: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
    return (
        <SelectPrimitive.Trigger
            className={cn('flex items-center justify-between gap-2 rounded-lg border border-edge bg-card py-1.5 pr-2.5 pl-3 text-sm outline-none hover:bg-bg', className)}
            {...props}
        >
            {children}
            <SelectPrimitive.Icon asChild>
                <svg className="text-sub" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                </svg>
            </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
    )
}

function SelectContent({className, children, ...props}: React.ComponentProps<typeof SelectPrimitive.Content>) {
    return (
        <SelectPrimitive.Portal>
            <SelectPrimitive.Content
                position="popper"
                sideOffset={4}
                className={cn('z-50 min-w-(--radix-select-trigger-width) overflow-hidden rounded-lg border border-edge bg-card shadow-lg', className)}
                {...props}
            >
                <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
    )
}

function SelectItem({className, children, ...props}: React.ComponentProps<typeof SelectPrimitive.Item>) {
    return (
        <SelectPrimitive.Item
            className={cn('flex cursor-default items-center justify-between gap-3 rounded-md py-1.5 pr-2.5 pl-3 text-sm outline-none select-none data-highlighted:bg-bg', className)}
            {...props}
        >
            <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
            <SelectPrimitive.ItemIndicator>
                <svg className="text-accent" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </SelectPrimitive.ItemIndicator>
        </SelectPrimitive.Item>
    )
}

export {Select, SelectContent, SelectItem, SelectTrigger, SelectValue}
