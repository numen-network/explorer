'use client'

import {Menu, XIcon} from 'lucide-react'
import {cn} from 'cn'
import AccountFace from '@/components/AccountFace'
import AddressText from '@/components/AddressText'
import IdentityName from '@/components/IdentityName'
import Markdown from '@/components/Markdown'
import Socials from '@/components/Socials'
import {Button} from '@/components/ui/button'
import {Dialog, DialogClose, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Separator} from '@/components/ui/separator'
import {splitBio, type IdentityRef} from '@/lib/identity'

export default function BioDialog({acc, addr, size = 'icon', className}: {acc: IdentityRef & {id: string}; addr: string; size?: 'icon' | 'icon-xs'; className?: string}) {
    const {short, full} = splitBio(acc.identityJson)
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
                    <AccountFace hex={acc.id} json={acc.identityJson} className="size-14" />
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
                {full && (
                    <>
                        <Separator />
                        <Markdown text={full} />
                    </>
                )}
            </DialogContent>
        </Dialog>
    )
}
