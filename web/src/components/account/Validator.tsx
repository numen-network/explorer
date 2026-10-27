import Approx from '@/components/Approx'
import Pager from '@/components/Pager'
import StatTile from '@/components/StatTile'
import {LockExpiry, RejoinAfter, ValidatorStatus} from '@/components/ValidatorStatus'
import {Card} from '@/components/ui/card'
import {chainDbHead, windowStart, type ChainProps} from '@/lib/chain'
import {fmtInt} from '@/lib/format'
import {validatorOffenceCounts, validatorOffences, type ValidatorRow} from '@/lib/gql'
import {OFFENCE_DAYS, OFFENCE_LABEL} from '@/lib/offences'
import {paging} from '@/lib/paging'
import {renewEvery} from '@/lib/renewal'
import {ValidatorOffencesTable} from './ValidatorOffencesTable'
import {tabHref, type TabCtx} from './shared'

export default async function Validator({hex, addr, sp}: TabCtx) {
    const pg = paging(sp)
    const page = await validatorOffences(hex, pg.size, pg.offset)
    return (
        <>
            <Card size="flush">
                <ValidatorOffencesTable rows={page.offences} />
            </Card>
            <Pager paging={pg} total={page.all.totalCount} href={tabHref(addr, 'validator')} />
        </>
    )
}

// the tile the whole Validator group shares, above its tab strip
export async function ValidatorHead({hex, chain, v}: {hex: string; chain: ChainProps; v: ValidatorRow}) {
    const head = await chainDbHead()
    const counts = await validatorOffenceCounts(hex, windowStart(head, OFFENCE_DAYS))
    return <ValidatorTile v={v} offline={counts.offline.totalCount} equivocations={counts.equivocations.totalCount} chain={chain} head={head.height} renewEvery={renewEvery(head, chain)} className="mt-4" />
}

export function ValidatorTile({v, offline, equivocations, chain, head, renewEvery, className}: {v: ValidatorRow; offline: number; equivocations: number; chain: ChainProps; head: number; renewEvery: string; className?: string}) {
    return (
        <StatTile
            label="Status"
            value={<ValidatorStatus v={v} />}
            beside={[
                {label: 'Locked', value: <Approx planck={v.lockedAmount} decimals={chain.decimals} symbol={chain.symbol} breakable />},
                {label: 'Lock expiry', value: <LockExpiry v={v} renewEvery={renewEvery} />},
                {label: 'Rejoin after', value: <RejoinAfter v={v} head={head} />},
                {label: OFFENCE_LABEL.Offline, value: fmtInt(offline)},
                {label: OFFENCE_LABEL.Equivocation, value: fmtInt(equivocations)},
                {label: 'Last active session', value: v.lastActiveSession != null ? `#${fmtInt(v.lastActiveSession)}` : '—'},
            ]}
            pairs
            className={className}
        />
    )
}
