'use client'

import {useId, useState} from 'react'
import {diffWords} from 'diff'
import {ChevronDown, XIcon} from 'lucide-react'
import CopyBtn from '@/components/CopyBtn'
import {TimeCell} from '@/components/TimeCell'
import {StepLinks} from '@/components/timeline'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle} from '@/components/ui/dialog'
import {Label} from '@/components/ui/label'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select'
import {Separator} from '@/components/ui/separator'
import type {MetadataActionRow} from '@/lib/gql'

type Version = Pick<MetadataActionRow, 'id' | 'hash' | 'title' | 'description' | 'block' | 'timestamp'> & {event?: {indexInBlock: number; extrinsic: {id: string} | null}}

const NONE = 'none'

// no version to compare against reads as it was
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

const VersionName = ({versions, index}: {versions: Version[]; index: number}) => (
    <span>
        {index === versions.length - 1 ? 'Original' : 'Edited'} <TimeCell iso={versions[index].timestamp} />
    </span>
)

function VersionSelect({label, versions, value, excluded, onChange, none}: {label: string; versions: Version[]; value: number | null; excluded: number | null; onChange: (value: number | null) => void; none?: boolean}) {
    const id = useId()
    const version = value === null ? null : versions[value]
    return (
        <div className="min-w-0">
            <Label htmlFor={id} className="mb-1 text-xs font-normal text-muted-foreground">
                {label}
            </Label>
            <Select value={value === null ? NONE : String(value)} onValueChange={v => onChange(v === NONE ? null : Number(v))}>
                <SelectTrigger id={id} className="w-full text-left text-xs whitespace-normal data-[size=default]:h-auto *:data-[slot=select-value]:line-clamp-none">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper">
                    {none && (
                        <SelectItem value={NONE} className="text-xs">
                            None
                        </SelectItem>
                    )}
                    {versions.map(
                        (v, i) =>
                            i !== excluded && (
                                <SelectItem key={v.id} value={String(i)} className="text-xs">
                                    <VersionName versions={versions} index={i} />
                                </SelectItem>
                            )
                    )}
                </SelectContent>
            </Select>
            {version && (
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                    <StepLinks block={version.block} event={version.event} />
                </div>
            )}
        </div>
    )
}

function Revision({versions, start}: {versions: Version[]; start: number}) {
    const [to, setTo] = useState(start)
    const [from, setFrom] = useState<number | null>(start === versions.length - 1 ? null : start + 1)
    const version = versions[to]
    const previous = from === null ? undefined : versions[from]
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
            <div className="grid grid-cols-[minmax(0,1fr)] gap-4 sm:grid-cols-2">
                <VersionSelect label="From" versions={versions} value={from} excluded={to} onChange={setFrom} none />
                <VersionSelect label="To" versions={versions} value={to} excluded={from} onChange={v => setTo(v!)} />
            </div>
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

/** A referendum's texts, newest first, any two of them diffed against each other. */
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
                            <VersionName versions={versions} index={i} />
                            {i === 0 && ' (most recent)'}
                        </button>
                    ))}
                </PopoverContent>
            </Popover>
            <Dialog open={picked !== null} onOpenChange={open => !open && setPicked(null)}>
                {picked !== null && <Revision versions={versions} start={picked} />}
            </Dialog>
        </div>
    )
}
