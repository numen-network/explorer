'use client'

import {XIcon} from 'lucide-react'
import Markdown from '@/components/Markdown'
import SegmentedControl from '@/components/SegmentedControl'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Tabs, TabsContent} from '@/components/ui/tabs'

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
                <DialogContent aria-describedby={undefined} showCloseButton={false} className="max-h-[85dvh] overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
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
                        <TabsContent value="raw" className={body}>
                            {text}
                        </TabsContent>
                        <TabsContent value="markdown">
                            <Markdown text={text} />
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>
        </>
    )
}
