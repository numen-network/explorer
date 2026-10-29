'use client'

import {useState} from 'react'
import {diffWords} from 'diff'
import {ChevronDown, XIcon} from 'lucide-react'
import CopyBtn from '@/components/CopyBtn'
import {TimeCell} from '@/components/TimeCell'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle} from '@/components/ui/dialog'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {Separator} from '@/components/ui/separator'
import type {MetadataActionRow} from '@/lib/gql'

type Version = Pick<MetadataActionRow, 'id' | 'hash' | 'title' | 'description' | 'timestamp'>

// each version against the one before it, the original stands alone
function Marked({from, to}: {from: string | null | undefined; to: string | null}) {
    if (from === undefined) return to
    return diffWords(from ?? '', to ?? '').map((part, i) =>
        part.added ? (
            <ins key={i} className="rounded-sm bg-good-soft px-0.5 no-underline">
                {part.value}
            </ins>
        ) : part.removed ? (
            <del key={i} className="rounded-sm bg-destructive-soft px-0.5 text-muted-foreground">
                {part.value}
            </del>
        ) : (
            part.value
        )
    )
}

function Revision({version, previous}: {version: Version; previous: Version | undefined}) {
    const description = version.description ?? previous?.description
    return (
        <DialogContent aria-describedby={undefined} showCloseButton={false} className="max-h-[85dvh] gap-4 overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
            <div className="flex items-center justify-between gap-4">
                <DialogTitle className="text-base font-semibold">Proposal Revision</DialogTitle>
                <DialogClose asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Close" className="-my-1 -mr-1.5">
                        <XIcon />
                    </Button>
                </DialogClose>
            </div>
            <p className="text-xs text-muted-foreground">
                {previous ? 'Edited' : 'Original'} at <TimeCell iso={version.timestamp} cycle />
            </p>
            <p className="text-base font-semibold wrap-anywhere">
                <Marked from={previous ? previous.title : undefined} to={version.title} />
            </p>
            {description != null && (
                <p className="text-sm leading-[22px] whitespace-pre-wrap wrap-anywhere">
                    <Marked from={previous ? previous.description : undefined} to={version.description} />
                </p>
            )}
            <p className="flex items-center gap-1 text-xs text-dim">
                <span className="font-mono break-all">{version.hash}</span>
                <CopyBtn text={version.hash} />
            </p>
        </DialogContent>
    )
}

/** A referendum's texts, newest first, each one diffed against the one before. */
export default function EditedHistory({versions, className}: {versions: Version[]; className?: string}) {
    const [listed, setListed] = useState(false)
    const [picked, setPicked] = useState<number | null>(null)
    const edits = versions.length - 1
    return (
        <div className={className}>
            <Popover open={listed} onOpenChange={setListed}>
                <PopoverTrigger className="group inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                    Edited
                    <ChevronDown className="size-3.5 transition-transform group-data-[state=open]:rotate-180" />
                </PopoverTrigger>
                <PopoverContent align="start" collisionPadding={16} className="max-h-[50vh] w-max max-w-(--radix-popover-content-available-width) gap-0 overflow-y-auto p-2">
                    <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                        Edited {edits} {edits > 1 ? 'times' : 'time'}
                    </p>
                    <Separator className="my-2" />
                    {versions.map((v, i) => (
                        <button
                            key={v.id}
                            type="button"
                            onClick={() => {
                                setListed(false)
                                setPicked(i)
                            }}
                            className="block w-full rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent"
                        >
                            {i === edits ? 'Original' : 'Edited'} <TimeCell iso={v.timestamp} />
                            {i === 0 && ' (most recent)'}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
            <Dialog open={picked !== null} onOpenChange={open => !open && setPicked(null)}>
                {picked !== null && <Revision version={versions[picked]} previous={versions[picked + 1]} />}
            </Dialog>
        </div>
    )
}
