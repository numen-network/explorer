'use client'

import Link from 'next/link'
import {Fragment} from 'react'
import {cn} from 'cn'
import {useAddrHot} from '@/components/addrHot'
import AddressText from '@/components/AddressText'
import IdentityName from '@/components/IdentityName'
import {Tip} from '@/components/Tip'
import {useWellKnown} from '@/components/wellKnown'
import {identityFields, identityInfoJson, identityLabel, type IdentityRef} from '@/lib/identity'

const SKIP = new Set(['display', 'avatar', 'bio'])

// shows the identity label with a judgement badge, a sub with no registration
// of its own reads as super/sub with the judgement of the super, falls back
// to the address as one fixed middle elided string in the statescan manner,
// full shows the whole address on list pages with room for it, hovering
// floats the full address in a tooltip. a label truncates to fit its room and
// a full address wraps, 7…4 keeps its width. plain is for the places that pin
// an account down by address, where a name only repeats the label next to it
export default function AccountLink({addr, acc, className = '', full = false, plain = false}: {addr: string; acc?: IdentityRef; className?: string; full?: boolean; plain?: boolean}) {
    const known = useWellKnown(addr)
    const label = plain ? undefined : (known?.label ?? identityLabel(acc))
    const fields = identityFields(identityInfoJson(acc)).filter(f => !SKIP.has(f.key))
    const {cls, ...hot} = useAddrHot(addr)
    const details = (
        <>
            <span className="font-mono">{addr}</span>
            {fields.length > 0 && (
                <span className="grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-0.5 border-t border-current/25 pt-1.5">
                    {fields.map(f => (
                        <Fragment key={f.key}>
                            <span className="opacity-60">{f.label}</span>
                            <span className="truncate">{f.value}</span>
                        </Fragment>
                    ))}
                </span>
            )}
        </>
    )
    return (
        <span className={cn('inline-flex max-w-full items-center align-top', (label || full) && 'min-w-0', className)}>
            <Tip text={details} align="start" sideOffset={4} className="sm:max-w-md flex-col items-start">
                <Link href={`/account/${addr}`} className={`-mx-1 flex min-w-0 items-center gap-1 px-1 hover:text-primary ${cls}`} {...hot}>
                    {label ? (
                        known ? (
                            <>
                                <span className="shrink-0" aria-hidden>
                                    {known.emoji}
                                </span>
                                <span className="truncate font-medium">{label}</span>
                            </>
                        ) : (
                            <IdentityName acc={acc!} />
                        )
                    ) : (
                        <span className="min-w-0 font-mono font-medium"><AddressText addr={addr} full={full} /></span>
                    )}
                </Link>
            </Tip>
        </span>
    )
}
