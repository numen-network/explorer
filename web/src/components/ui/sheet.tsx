'use client'

import * as React from 'react'
import {Dialog as SheetPrimitive} from 'radix-ui'
import {cn} from '@/lib/utils'

function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
    return <SheetPrimitive.Root {...props} />
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
    return <SheetPrimitive.Trigger {...props} />
}

function SheetTitle(props: React.ComponentProps<typeof SheetPrimitive.Title>) {
    return <SheetPrimitive.Title {...props} />
}

function SheetContent({className, children, ...props}: React.ComponentProps<typeof SheetPrimitive.Content>) {
    return (
        <SheetPrimitive.Portal>
            <SheetPrimitive.Overlay className="fixed inset-0 z-40 bg-black/40 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=closed]:animate-out data-[state=closed]:fade-out-0" />
            <SheetPrimitive.Content
                className={cn(
                    'fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto border-r border-edge bg-card p-6 shadow-lg outline-none transition ease-in-out data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=open]:slide-in-from-left data-[state=closed]:duration-300 data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left',
                    className
                )}
                {...props}
            >
                {children}
                {/* x geometry is a lucide icon under ISC, inlined */}
                <SheetPrimitive.Close aria-label="Close" className="absolute top-3 right-4 p-2">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18" />
                        <path d="m6 6 12 12" />
                    </svg>
                </SheetPrimitive.Close>
            </SheetPrimitive.Content>
        </SheetPrimitive.Portal>
    )
}

export {Sheet, SheetContent, SheetTitle, SheetTrigger}
