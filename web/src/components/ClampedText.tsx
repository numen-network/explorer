'use client'

import {useEffect, useState} from 'react'
import {XIcon} from 'lucide-react'
import Markdown from '@/components/Markdown'
import SegmentedControl from '@/components/SegmentedControl'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Tabs, TabsContent} from '@/components/ui/tabs'
import {TEXT_PREVIEW_CHARS} from '@/lib/format'

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

/** A text preview with a dialog for the whole, fetched from `full` when the page holds only the preview. */
export default function ClampedText({text, full}: {text: string; full?: string}) {
    const chars = [...text]
    if (!full && chars.length <= TEXT_PREVIEW_CHARS) return <div className={`max-h-48 overflow-auto ${BODY}`}>{text}</div>
    return (
        <>
            <div className={`max-h-48 overflow-auto ${BODY}`}>
                {chars.slice(0, TEXT_PREVIEW_CHARS).join('')}… <span className="text-muted-foreground">(truncated)</span>
            </div>
            <Dialog>
                <DialogTrigger className="mt-1 cursor-pointer text-xs text-primary hover:underline">Show full</DialogTrigger>
                <DialogContent aria-describedby={undefined} showCloseButton={false} className="max-h-[85dvh] overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
                    <TextViews text={text} href={full} />
                </DialogContent>
            </Dialog>
        </>
    )
}
