import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {Badge} from '@/components/ui/badge'
import {Card} from '@/components/ui/card'
import {chainDbHead, windowStart, type ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorOffences, type ValidatorRow} from '@/lib/gql'
import {OFFENCE_DAYS, OFFENCE_LABEL} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {variantName} from '@/lib/variant'
import {ValidatorOffencesTable} from './ValidatorOffencesTable'
import {tabHref, type TabCtx} from './shared'

export default async function Validator({hex, addr, chain, sp, v}: TabCtx & {v: ValidatorRow}) {
    const pg = paging(sp)
    const head = await chainDbHead()
    const page = await validatorOffences(hex, windowStart(head, OFFENCE_DAYS), pg.size, pg.offset)
    return (
        <>
            <ValidatorTile v={v} offline={page.offline.totalCount} equivocations={page.equivocations.totalCount} chain={chain} />
            <Card size="flush">
                <ValidatorOffencesTable rows={page.offences} />
            </Card>
            <Pager paging={pg} total={page.all.totalCount} href={tabHref(addr, 'validator')} />
        </>
    )
}

export function ValidatorTile({v, offline, equivocations, chain}: {v: ValidatorRow; offline: number; equivocations: number; chain: ChainProps}) {
    const kicked = variantName(v.kicked)
    return (
        <StatTile
            label="Status"
            value={<Badge variant={kicked ? 'neg' : v.active ? 'pos' : 'idle'}>{kicked ? `Kicked · ${kicked}` : v.active ? 'Active' : 'Inactive'}</Badge>}
            beside={[
                {label: 'Locked', value: <Approx planck={v.lockedAmount} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                {label: 'Lock expiry', value: v.lockExpiry ? fmtInt(v.lockExpiry) : '—'},
                {label: OFFENCE_LABEL.Offline, value: fmtInt(offline)},
                {label: OFFENCE_LABEL.Equivocation, value: fmtInt(equivocations)},
                {label: 'Last active session', value: v.lastActiveSession != null ? `#${fmtInt(v.lastActiveSession)}` : '—'},
            ]}
            pairs
            className="mb-3"
        />
    )
}
