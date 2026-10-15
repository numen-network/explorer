'use client'

import {useState} from 'react'
import {Menu, XIcon} from 'lucide-react'
import {cn} from 'cn'
import AddressText from '@/components/AddressText'
import IdentityName from '@/components/IdentityName'
import Markdown from '@/components/Markdown'
import Socials from '@/components/Socials'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Separator} from '@/components/ui/separator'
import type {AccountRef} from '@/lib/gql'
import {identityLabel, infoField, splitBio} from '@/lib/identity'
import {https} from '@/lib/url'

const graphemes = new Intl.Segmenter()

const initial = (label: string) => graphemes.segment(label)[Symbol.iterator]().next().value?.segment.toUpperCase()

// an image that failed before hydration never fires onError, so the ref checks it too
export function Avatar({acc, addr, className}: {acc: AccountRef; addr: string; className?: string}) {
    const [broken, setBroken] = useState(false)
    const src = https(infoField(acc.identityJson, 'avatar'))
    if (src && !broken)
        return (
            <img
                src={src}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
                ref={img => {
                    if (img?.complete && img.naturalWidth === 0) setBroken(true)
                }}
                onError={() => setBroken(true)}
                className={cn('size-11 shrink-0 rounded-full bg-muted object-cover', className)}
            />
        )
    return (
        <span aria-hidden className={cn('grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[17px] font-semibold text-primary', className)}>
            {initial(identityLabel(acc) ?? addr)}
        </span>
    )
}

// renders nothing when the bio has no full part
export default function BioDialog({acc, addr, size = 'icon', className}: {acc: AccountRef; addr: string; size?: 'icon' | 'icon-xs'; className?: string}) {
    const {short, full} = splitBio(acc.identityJson)
    if (!full) return null
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size={size} aria-label="Bio" className={cn('bg-card', className)}>
                    <Menu />
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} showCloseButton={false} className="max-h-[85dvh] gap-4 overflow-y-auto border p-6 shadow-lg ring-0 sm:max-w-[800px]">
                <div className="flex items-center justify-between gap-4">
                    <DialogTitle className="text-base font-semibold">Detail</DialogTitle>
                    <DialogClose asChild>
                        <Button variant="ghost" size="icon-sm" aria-label="Close" className="-my-1 -mr-1.5">
                            <XIcon />
                        </Button>
                    </DialogClose>
                </div>
                <div className="flex min-w-0 flex-col items-start gap-2.5 [&>span:empty]:hidden">
                    <Avatar acc={acc} addr={addr} className="size-14 text-[22px]" />
                    <span className="flex max-w-full min-w-0 items-center gap-1 text-base">
                        <IdentityName acc={acc} fallback={<AddressText addr={addr} />} />
                    </span>
                    {short && (
                        <p dir="auto" className="max-w-full text-sm leading-[22px] text-muted-foreground wrap-anywhere">
                            {short}
                        </p>
                    )}
                    <Socials json={acc.identityJson} />
                </div>
                <Separator />
                <Markdown text={full} />
            </DialogContent>
        </Dialog>
    )
}
