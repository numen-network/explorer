import type {ReactNode} from 'react'
import {TriangleAlert} from 'lucide-react'
import {EvmTxLink} from '@/components/links'
import {Tip} from '@/components/Tip'
import type {TokenTransferRow} from '@/lib/gql'

type Flags = Pick<TokenTransferRow, 'amount' | 'thirdParty'>

const TIP = 'This transaction is suspected to be a malicious attack as it was not initiated by either party and the transfer amount is 0. Assets remain intact. Never copy an address from it.'

export const isPoisoning = (t: Flags) => t.thirdParty && BigInt(t.amount) === 0n

// greys every part of the row but the mark, which greys what it wraps itself
export const poisoningRow = (t: Flags) => (isPoisoning(t) ? '*:*:not-data-[slot=poisoning]:opacity-50' : undefined)

export function PoisoningMark({t, children}: {t: Flags; children: ReactNode}) {
    if (!isPoisoning(t)) return children
    return (
        <span data-slot="poisoning" className="inline-flex items-center gap-1">
            <span className="opacity-50">{children}</span>
            <Tip text={TIP}>
                <TriangleAlert role="img" aria-label="Suspected address poisoning" className="size-3 shrink-0 text-warn" />
            </Tip>
        </span>
    )
}

export function TransferTxLink({t}: {t: Flags & Pick<TokenTransferRow, 'transaction'>}) {
    return (
        <PoisoningMark t={t}>
            <EvmTxLink hash={t.transaction.id} />
        </PoisoningMark>
    )
}
