import AccountLink from '@/components/AccountLink'
import RetiredBadge from '@/components/RetiredBadge'
import {fmtInt} from '@/lib/format'
import type {AccountRef} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

// account is null once the seat is retired, undefined when the index knows no such seat
export default function RegistrarSeat({index, account, ss58}: {index: number; account: AccountRef | null | undefined; ss58: number}) {
    return (
        <span className="inline-flex items-center gap-1.5">
            <span className="font-mono leading-none text-muted-foreground">#{fmtInt(index)}</span>
            {account !== undefined && (account ? <AccountLink addr={ss58Encode(account.id, ss58)} acc={account} /> : <RetiredBadge />)}
        </span>
    )
}
