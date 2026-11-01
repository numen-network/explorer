'use client'

import {type ReactNode, useEffect, useState} from 'react'
import {XIcon} from 'lucide-react'
import Markdown from '@/components/Markdown'
import SegmentedControl from '@/components/SegmentedControl'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import {fmtCount, textPreview} from '@/lib/format'
import {TEXT_BOX} from './textBox'

const BODY = 'leading-relaxed wrap-anywhere whitespace-pre-wrap'

function useRemoteText(href: string | undefined) {
    const [text, setText] = useState<string>()
    const [failed, setFailed] = useState(false)
    useEffect(() => {
        if (!href) return
        const request = new AbortController()
        fetch(href, {signal: request.signal})
            .then(res => (res.ok ? res.text() : Promise.reject(new Error(`bytes http ${res.status}`))))
            .then(setText)
            .catch(() => setFailed(!request.signal.aborted))
        return () => request.abort()
    }, [href])
    return {text, failed}
}

function TextViews({text, href}: {text: string; href?: string}) {
    const remote = useRemoteText(href)
    const full = href ? remote.text : text
    const status = remote.failed ? 'Could not load the full text' : 'Loading…'
    return (
        <Tabs defaultValue="raw" className="min-w-0 gap-4">
            <div className="flex items-center gap-3">
                <DialogTitle className="text-base font-semibold">Text</DialogTitle>
                <SegmentedControl
                    options={[
                        ['raw', 'Raw'],
                        ['markdown', 'Markdown'],
                    ]}
                    size="sm"
                    className="ml-auto"
                />
                <DialogClose asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Close" className="-my-1 -mr-1.5">
                        <XIcon />
                    </Button>
                </DialogClose>
            </div>
            <TabsContent value="raw" className={BODY}>
                {full ?? status}
            </TabsContent>
            <TabsContent value="markdown">{full == null ? status : <Markdown text={full} />}</TabsContent>
        </Tabs>
    )
}

/** A larger view of text in a dialog, fetched from `full` when the page holds only a preview. */
export function TextDialog({text, full, trigger}: {text: string; full?: string; trigger: ReactNode}) {
    return (
        <Dialog>
            <DialogTrigger asChild>{trigger}</DialogTrigger>
            <DialogContent aria-describedby={undefined} showCloseButton={false} className="max-h-[85dvh] overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
                <TextViews text={text} href={full} />
            </DialogContent>
        </Dialog>
    )
}

/** Text in a scrolling box with a larger view in a dialog, fetched from `full` when the page holds only a preview. */
export default function ClampedText({text, bytes, full}: {text: string; bytes?: number; full?: string}) {
    const preview = textPreview(text)
    const truncated = full != null || preview !== text
    return (
        <>
            <div className="mb-1 text-xs text-muted-foreground">
                {bytes != null && `${fmtCount(bytes, 'byte')} · `}UTF-8{truncated && ' (truncated)'}
            </div>
            <div className={TEXT_BOX}>
                {preview}
                {truncated && '…'}
            </div>
            <TextDialog text={text} full={full} trigger={<button className="mt-1 block cursor-pointer text-xs text-primary hover:underline">View</button>} />
        </>
    )
}
