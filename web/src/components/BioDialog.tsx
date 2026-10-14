'use client'

import {useState} from 'react'
import {Menu} from 'lucide-react'
import {cn} from 'cn'
import AddressText from '@/components/AddressText'
import IdentityName from '@/components/IdentityName'
import Markdown from '@/components/Markdown'
import {Button} from '@/components/ui/button'
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import type {AccountRef} from '@/lib/gql'
import {identityLabel, infoField, splitBio} from '@/lib/identity'
import {https} from '@/lib/url'

const graphemes = new Intl.Segmenter()

const initial = (label: string) => graphemes.segment(label)[Symbol.iterator]().next().value?.segment.toUpperCase()

// an image that failed before hydration never fires onError, so the ref checks it too
export function Avatar({acc, addr}: {acc: AccountRef; addr: string}) {
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
                className="size-11 shrink-0 rounded-full bg-muted object-cover"
            />
        )
    return (
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-primary-soft text-[17px] font-semibold text-primary">
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
            <DialogContent aria-describedby={undefined} className="max-h-[85dvh] gap-4 overflow-y-auto p-6 sm:max-w-lg">
                <DialogTitle className="flex min-w-0 items-center gap-3 pr-8 text-base font-normal">
                    <Avatar acc={acc} addr={addr} />
                    <span className="flex min-w-0 items-center gap-1">
                        <IdentityName acc={acc} fallback={<AddressText addr={addr} />} />
                    </span>
                </DialogTitle>
                <div className="flex flex-col gap-2 text-sm leading-[22px] wrap-anywhere">
                    {short && (
                        <p dir="auto" className="font-semibold">
                            {short}
                        </p>
                    )}
                    <Markdown text={full} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
