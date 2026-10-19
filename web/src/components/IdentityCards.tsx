'use client'

import {ChevronDown, Plus} from 'lucide-react'
import {cn} from 'cn'
import AccountLink from '@/components/AccountLink'
import AddressText from '@/components/AddressText'
import Approx from '@/components/Approx'
import AccountFace from '@/components/AccountFace'
import BioDialog from '@/components/BioDialog'
import CopyBtn from '@/components/CopyBtn'
import Socials from '@/components/Socials'
import {Button} from '@/components/ui/button'
import {Card} from '@/components/ui/card'
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover'
import type {ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import type {IdentityRow} from '@/lib/gql'
import {identityLabel, splitBio} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'

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

export function delegateHref(wallet: string, addr: string): string {
    const url = new URL(wallet)
    url.searchParams.set('delegate', addr)
    return url.href
}

function IdentityCard({row, chain, wallet}: {row: IdentityRow; chain: ChainProps; wallet: string}) {
    const addr = ss58Encode(row.id, chain.ss58)
    const label = identityLabel(row)
    const {short} = splitBio(row.identityJson)
    return (
        <Card className="row-span-4 mb-4 grid grid-rows-subgrid gap-0 py-0">
            <div className="flex min-w-0 flex-wrap items-center gap-3 px-5 pt-[18px]">
                <div className="flex min-w-0 flex-auto items-center gap-3">
                    <AccountFace hex={row.id} json={row.identityJson} className="size-11" />
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
                    <BioDialog acc={row} addr={addr} />
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
