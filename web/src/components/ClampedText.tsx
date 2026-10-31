'use client'

import {Dialog, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'

const LIMIT = 100

export default function ClampedText({text}: {text: string}) {
    const chars = [...text]
    const body = 'leading-relaxed wrap-anywhere whitespace-pre-wrap'
    if (chars.length <= LIMIT) return <div className={`max-h-48 overflow-auto ${body}`}>{text}</div>
    return (
        <>
            <div className={`max-h-48 overflow-auto ${body}`}>
                {chars.slice(0, LIMIT).join('')}… <span className="text-muted-foreground">(truncated)</span>
            </div>
            <Dialog>
                <DialogTrigger className="mt-1 cursor-pointer text-xs text-primary hover:underline">Show full</DialogTrigger>
                <DialogContent aria-describedby={undefined} className="max-h-[85dvh] overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
                    <DialogTitle className="text-base font-semibold">Text</DialogTitle>
                    <div className={body}>{text}</div>
                </DialogContent>
            </Dialog>
        </>
    )
}
