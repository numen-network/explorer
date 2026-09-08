import {DetailCard, DetailRow} from '@/components/Detail'
import {Badge} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtInt} from '@/lib/format'
import type {ValidatorRow} from '@/lib/gql'
import {variantName} from '@/lib/variant'

export default function Validator({v, chain}: {v: ValidatorRow; chain: ChainProps}) {
    const kicked = variantName(v.kicked)
    return (
        <DetailCard>
            <DetailRow label="Status">
                <Badge variant={kicked ? 'neg' : v.active ? 'pos' : 'idle'}>{kicked ? `Kicked · ${kicked}` : v.active ? 'Active' : 'Inactive'}</Badge>
            </DetailRow>
            <DetailRow label="Locked">{fmtBalance(v.lockedAmount, chain.decimals, chain.symbol)}</DetailRow>
            <DetailRow label="Lock expiry">{v.lockExpiry ? fmtInt(v.lockExpiry) : '—'}</DetailRow>
            <DetailRow label="Offline sessions">{fmtInt(v.offlineSessions)}</DetailRow>
            <DetailRow label="Equivocations">{fmtInt(v.equivocations)}</DetailRow>
            <DetailRow label="Last active session">#{fmtInt(v.lastActiveSession)}</DetailRow>
        </DetailCard>
    )
}
