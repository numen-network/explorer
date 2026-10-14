'use client'

import {useState} from 'react'
import {ChevronDown, Menu, Plus} from 'lucide-react'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import AddressText from '@/components/AddressText'
import Approx from '@/components/Approx'
import CopyBtn from '@/components/CopyBtn'
import IdentityName from '@/components/IdentityName'
import Markdown from '@/components/Markdown'
import Socials from '@/components/Socials'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Dialog, DialogContent, DialogTitle, DialogTrigger} from '@/components/ui/dialog'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {IdentityRow} from '@/lib/gql'
import {fieldText, identityLabel} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {https} from '@/lib/url'

const infoField = (json: unknown, key: string) => fieldText((json as {info?: Record<string, unknown>})?.info?.[key])

// the wallet takes the first line of a bio as its short bio and the rest as the full one
function splitBio(bio: string | null) {
    const [short = '', ...rest] = (bio ?? '').split('\n')
    return {short, full: rest.join('\n').trim()}
}

const graphemes = new Intl.Segmenter()

const initial = (label: string) => graphemes.segment(label)[Symbol.iterator]().next().value?.segment.toUpperCase()

// an image that failed before hydration never fires onError, so the ref checks it too
function Avatar({src, label}: {src: string | null; label: string}) {
    const [broken, setBroken] = useState(false)
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
            {initial(label)}
        </span>
    )
}

function Subs({row, ss58}: {row: IdentityRow; ss58: number}) {
    if (row.subs.length === 0) return fmtInt(0)
    return (
        <Popover>
            <PopoverTrigger aria-label={`${fmtInt(row.subs.length)} sub identities`} className="inline-flex items-center gap-0.5 text-primary hover:text-primary-hover">
                {fmtInt(row.subs.length)}
                <ChevronDown className="size-3.5 transition-transform in-data-[state=open]:rotate-180" />
            </PopoverTrigger>
            <PopoverContent align="end" className="max-h-72 w-max max-w-[min(32rem,var(--radix-popover-content-available-width))] gap-1.5 overflow-y-auto font-normal">
                {row.subs.map(s => (
                    <AccountLink key={s.id} addr={ss58Encode(s.id, ss58)} acc={s} className="min-w-0" />
                ))}
            </PopoverContent>
        </Popover>
    )
}

function BioDialog({row, addr, label, short, full}: {row: IdentityRow; addr: string; label: string | undefined; short: string; full: string}) {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Bio" className="bg-card">
                    <Menu />
                </Button>
            </DialogTrigger>
            <DialogContent aria-describedby={undefined} className="max-h-[85dvh] gap-4 overflow-y-auto p-6 sm:max-w-lg">
                <DialogTitle className="flex min-w-0 items-center gap-3 pr-8 text-base font-normal">
                    <Avatar src={https(infoField(row.identityJson, 'avatar'))} label={label ?? addr} />
                    <span className="flex min-w-0 items-center gap-1">
                        <IdentityName acc={row} fallback={<AddressText addr={addr} />} />
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

export function delegateHref(wallet: string, addr: string): string {
    const url = new URL(wallet)
    url.searchParams.set('delegate', addr)
    return url.href
}

function IdentityCard({row, chain, wallet}: {row: IdentityRow; chain: ChainProps; wallet: string}) {
    const addr = ss58Encode(row.id, chain.ss58)
    const label = identityLabel(row)
    const {short, full} = splitBio(infoField(row.identityJson, 'bio'))
    return (
        <Card className="row-span-4 mb-4 grid grid-rows-subgrid gap-0 py-0">
            <div className="flex min-w-0 flex-wrap items-center gap-3 px-5 pt-[18px]">
                <div className="flex min-w-0 flex-auto items-center gap-3">
                    <Avatar src={https(infoField(row.identityJson, 'avatar'))} label={label ?? addr} />
                    <div className="flex min-w-0 flex-col gap-0.5 text-[15px]">
                        <span className="flex min-w-0 items-center">
                            <AccountLink addr={addr} acc={row} className="min-w-0" />
                            {!label && <CopyBtn text={addr} />}
                        </span>
                        {label && (
                            <span className="text-xs text-muted-foreground">
                                <AddressText addr={addr} />
                                <CopyBtn text={addr} />
                            </span>
                        )}
                    </div>
                </div>
                <div className="ml-auto flex shrink-0 gap-2">
                    <Button asChild variant="outline" className="bg-card">
                        <a href={delegateHref(wallet, addr)} target="_blank" rel="noopener noreferrer">
                            <Plus />
                            Delegate
                        </a>
                    </Button>
                    {full && <BioDialog row={row} addr={addr} label={label} short={short} full={full} />}
                </div>
            </div>
            <p dir="auto" className={cn('truncate px-5 text-[13px] leading-5 text-muted-foreground', short && 'mt-3')}>{short}</p>
            <div className="px-5 has-[svg]:mt-3">
                <Socials json={row.identityJson} />
            </div>
            <dl className="mt-3.5 grid grid-cols-[minmax(0,1fr)_minmax(max-content,1.6fr)_auto] gap-4 self-end border-t px-5 py-3 text-xs text-muted-foreground">
                <div>
                    <dt>Delegators</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-foreground">{fmtInt(row.delegators)}</dd>
                </div>
                <div>
                    <dt>Delegated</dt>
                    <dd className="mt-0.5 text-sm font-semibold whitespace-nowrap text-foreground">
                        <Approx planck={row.delegated} decimals={chain.decimals} symbol={chain.symbol} />
                    </dd>
                </div>
                <div>
                    <dt>Subs</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-foreground">
                        <Subs row={row} ss58={chain.ss58} />
                    </dd>
                </div>
            </dl>
        </Card>
    )
}

// the card rows run on a subgrid, so the bios, socials and figures of the cards
// sharing a line start at the same height whatever each card filled in. a row
// gap on the grid would spread into every card, so the cards keep apart by margin
export default function IdentityCards({rows, chain, wallet, className}: {rows: IdentityRow[]; chain: ChainProps; wallet: string; className?: string}) {
    if (rows.length === 0) return <Card className={cn('px-5 py-6 text-sm text-muted-foreground', className)}>No identities yet.</Card>
    return (
        <div className={cn('grid grid-cols-[minmax(0,1fr)] gap-x-4 md:grid-cols-2 xl:grid-cols-3', className)}>
            {rows.map(r => (
                <IdentityCard key={r.id} row={r} chain={chain} wallet={wallet} />
            ))}
        </div>
    )
}
