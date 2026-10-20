import type {ReactNode} from 'react'
import {Ban, Lock, LockOpen, LogOut, RefreshCw, ShieldAlert, ShieldCheck, ShieldOff, UserMinus, type LucideIcon} from 'lucide-react'
import Pager from '@/components/Pager'
import {TimeCell} from '@/components/TimeCell'
import {RING, StepLinks, TimelineItem, TimelineList, TimelineRows, type Tone} from '@/components/timeline'
import type {ChainProps} from '@/lib/chain'
import {datedOrGenesis} from '@/lib/config'
import {camelLabel, fmtBalance, fmtInt} from '@/lib/format'
import {validatorSteps, type ValidatorEventStepRow, type ValidatorGenesisStepRow} from '@/lib/gql'
import {paging} from '@/lib/paging'
import {variantName} from '@/lib/variant'
import {tabHref, type TabCtx} from './shared'

interface Look {
    label: string
    tone: Tone
    icon: LucideIcon
}

// the event names read as what happened to the validator
const STEP: Record<string, Look> = {
    ValidatorLocked: {label: 'Locked', tone: 'primary', icon: Lock},
    ValidatorExitRequested: {label: 'Exit requested', tone: 'warn', icon: LogOut},
    ValidatorKicked: {label: 'Kicked', tone: 'neg', icon: Ban},
    LockReleased: {label: 'Lock released', tone: 'idle', icon: LockOpen},
    EquivocationReported: {label: 'Equivocation reported', tone: 'neg', icon: ShieldAlert},
    PendingValidatorDropped: {label: 'Dropped', tone: 'neg', icon: UserMinus},
}

const RENEWED: Look = {label: 'Renewed', tone: 'idle', icon: RefreshCw}
const GRANTED: Look = {label: 'Exemption granted', tone: 'pos', icon: ShieldCheck}
const REVOKED: Look = {label: 'Exemption revoked', tone: 'neg', icon: ShieldOff}

interface StepArgs {
    amount?: string
    expiryBlock?: number
    reason?: unknown
    exempt?: boolean
}

function look(s: ValidatorEventStepRow): Look {
    if (s.renewals > 0) return RENEWED
    if (s.event.method === 'StakeExemptSet') return (s.event.args as StepArgs).exempt ? GRANTED : REVOKED
    return STEP[s.event.method] ?? {label: camelLabel(s.event.method), tone: 'idle', icon: RING}
}

function stepRows(s: ValidatorEventStepRow, chain: ChainProps): [string, ReactNode][] {
    const args = s.lastEvent.args as StepArgs
    const rows: [string, ReactNode][] = []
    if (s.renewals > 0) rows.push(['Renewals', fmtInt(s.renewals)], ['Start time', <TimeCell key="start" iso={s.event.block.timestamp} cycle />])
    else if (args.amount != null) rows.push(['Amount', fmtBalance(args.amount, chain.decimals, chain.symbol)])
    if (args.expiryBlock != null) rows.push(['Lock expiry', fmtInt(args.expiryBlock)])
    if (args.reason != null) rows.push(['Reason', variantName(args.reason)])
    return rows
}

function EventStep({s, chain}: {s: ValidatorEventStepRow; chain: ChainProps}) {
    const {label, tone, icon} = look(s)
    const rows = stepRows(s, chain)
    return (
        <TimelineItem
            tone={tone}
            icon={icon}
            title={label}
            iso={s.lastEvent.block.timestamp}
            links={<StepLinks block={s.lastEvent.block.height} event={s.lastEvent} />}
            detail={rows.length > 0 ? <TimelineRows rows={rows} /> : undefined}
        />
    )
}

function GenesisStep({s, chain}: {s: ValidatorGenesisStepRow; chain: ChainProps}) {
    const rows: [string, ReactNode][] = []
    if (s.genesisLock != null) rows.push(['Amount', fmtBalance(s.genesisLock.amount, chain.decimals, chain.symbol)], ['Lock expiry', fmtInt(s.genesisLock.expiryBlock)])
    rows.push(['Stake exempt', s.genesisExempt ? 'Yes' : 'No'])
    return (
        <TimelineItem
            tone="primary"
            icon={Lock}
            title="Genesis"
            iso={datedOrGenesis(null, 0, chain.evmChainId) ?? undefined}
            links={<StepLinks block={0} />}
            detail={<TimelineRows rows={rows} />}
        />
    )
}

export default async function ValidatorTimeline({hex, addr, chain, sp}: TabCtx) {
    const pg = paging(sp)
    const page = await validatorSteps(hex, pg.size, pg.offset)
    return (
        <>
            <TimelineList empty={page.steps.length === 0}>
                {page.steps.map(s => (s.event === null ? <GenesisStep key={s.id} s={s} chain={chain} /> : <EventStep key={s.id} s={s} chain={chain} />))}
            </TimelineList>
            <Pager paging={pg} total={page.all.totalCount} href={tabHref(addr, 'validator-timeline')} />
        </>
    )
}
