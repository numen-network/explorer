'use client'

import Link from 'next/link'
import {Fragment} from 'react'
import {useAddrHot} from '@/components/addrHot'
import {shortHash} from '@/lib/format'
import {identityChannels, identityInfoJson, identityLabel, type IdentityRef} from '@/lib/identity'
import {Tooltip, TooltipContent, TooltipProvider, TooltipTrigger} from '@/components/ui/tooltip'

// mirrors the pallet identity judgement enum, bad verdicts win over good ones
type IdentityState = 'verified' | 'stale' | 'pending' | 'unjudged' | 'bad'

function identityState(identityJson: unknown): IdentityState | null {
    if (identityJson == null) return null
    const kinds = (((identityJson as any).judgements ?? []) as [number, {__kind: string}][]).map(([, j]) => j.__kind)
    if (kinds.some(k => k === 'Erroneous' || k === 'LowQuality')) return 'bad'
    if (kinds.some(k => k === 'Reasonable' || k === 'KnownGood')) return 'verified'
    if (kinds.some(k => k === 'OutOfDate')) return 'stale'
    if (kinds.some(k => k === 'FeePaid')) return 'pending'
    return 'unjudged'
}

const QUESTION = 'M5.4 5.4c0-1 .7-1.7 1.6-1.7s1.6.7 1.6 1.65c0 1.3-1.6 1.35-1.6 2.65M7 10.3v.2'

const BADGE: Record<IdentityState, {fill: string; mark: string}> = {
    verified: {fill: 'var(--color-pos)', mark: 'M4 7.2 6.1 9.3 10 5.2'},
    unjudged: {fill: '#9aa3b2', mark: QUESTION},
    pending: {fill: '#9aa3b2', mark: QUESTION},
    stale: {fill: 'var(--color-warn)', mark: 'M7 3.6v4.2M7 10.2v.2'},
    bad: {fill: 'var(--color-neg)', mark: 'M4.6 4.6l4.8 4.8M9.4 4.6l-4.8 4.8'},
}

function Badge({state}: {state: IdentityState}) {
    const b = BADGE[state]
    return (
        <svg width="1em" height="1em" viewBox="0 0 14 14" className="shrink-0 overflow-visible" aria-hidden>
            <circle cx="7" cy="7" r="7" fill={b.fill} />
            <path d={b.mark} stroke="#fff" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    )
}

// shows the identity label with a judgement badge, a sub with no registration
// of its own reads as super/sub with the judgement of the super, falls back
// to the address as one fixed middle elided string in the statescan manner,
// full shows the whole address on list pages with room for it, hovering
// floats the full address in a tooltip
export default function AccountLink({addr, acc, className = '', full = false}: {addr: string; acc?: IdentityRef; className?: string; full?: boolean}) {
    const display = identityLabel(acc)
    const info = identityInfoJson(acc)
    const state = identityState(info)
    const channels = identityChannels(info)
    const {cls, ...hot} = useAddrHot(addr)
    return (
        <span className={`flex min-w-0 items-center ${className}`}>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Link href={`/account/${addr}`} className={`-mx-1 flex min-w-0 items-center gap-1 px-1 hover:text-accent ${cls}`} {...hot}>
                            {display ? (
                                <>
                                    {state && <Badge state={state} />}
                                    <span className="truncate font-medium">{display}</span>
                                </>
                            ) : (
                                <span className="truncate font-mono font-medium">{full ? addr : shortHash(addr, 8, 6)}</span>
                            )}
                        </Link>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" sideOffset={4} className="max-w-md flex-col items-start">
                        <span className="font-mono">{addr}</span>
                        {channels.length > 0 && (
                            <span className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-t border-current/25 pt-1.5">
                                {channels.map(c => (
                                    <Fragment key={c.key}>
                                        <span className="opacity-60">{c.label}</span>
                                        <span className="truncate">{c.value}</span>
                                    </Fragment>
                                ))}
                            </span>
                        )}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </span>
    )
}
