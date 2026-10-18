import {shortAddr} from '@/components/AddressText'
import {FilterRow} from '@/components/pills'
import type {BadgeVariant} from '@/components/ui/badge'
import type {ChainProps} from '@/lib/chain'
import {fmtCount, fmtInt, fmtSpan} from '@/lib/format'
import type {AccountRef, AccountRow, AccountSummary, BountyDepositRow, ChildBountyDepositRow, GovDepositRow, ValidatorRow} from '@/lib/gql'
import {identityLabel} from '@/lib/identity'
import {ss58Encode} from '@/lib/ss58'
import {variantName} from '@/lib/variant'

export interface TabCtx {
    hex: string
    addr: string
    chain: ChainProps
    sp: Record<string, string | string[] | undefined>
}

export const JUDGEMENT_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'idle'> = {
    KnownGood: 'pos',
    Reasonable: 'pos',
    OutOfDate: 'warn',
    FeePaid: 'idle',
    Unknown: 'idle',
    LowQuality: 'neg',
    Erroneous: 'neg',
}

// a pager or a filter inside a tab has to carry the tab along, otherwise the
// next click drops the reader back on the first one
export function tabHref(addr: string, tab: string, extra: Record<string, string | number> = {}) {
    const q = new URLSearchParams({tab})
    for (const [k, v] of Object.entries(extra)) if (v !== '') q.set(k, String(v))
    return `/account/${addr}?${q}`
}

export type Direction = 'in' | 'out' | ''

const DIRECTION_LABEL: Record<string, string> = {out: 'Out', in: 'In'}

export const directionOf = (sp: TabCtx['sp']): Direction => (sp.dir === 'in' || sp.dir === 'out' ? sp.dir : '')

export function DirectionFilter({addr, tab, value}: {addr: string; tab: string; value: Direction}) {
    return <FilterRow label="Direction" className="mb-3" values={Object.keys(DIRECTION_LABEL)} labelOf={d => DIRECTION_LABEL[d]} value={value} href={d => tabHref(addr, tab, {dir: d})} />
}

export interface Schedule {
    locked: bigint
    perBlock: bigint
    start: number
    end: number
}

export const schedules = (json: unknown): Schedule[] =>
    ((json ?? []) as {locked: string; perBlock: string; startingBlock: number}[]).map(v => {
        const locked = BigInt(v.locked)
        const perBlock = BigInt(v.perBlock)
        const blocks = perBlock > 0n ? (locked + perBlock - 1n) / perBlock : 0n
        return {locked, perBlock, start: v.startingBlock, end: v.startingBlock + Number(blocks)}
    })

export const vestedAt = (s: Schedule, head: number) => {
    const elapsed = BigInt(Math.max(0, head - s.start))
    const done = elapsed * s.perBlock
    return done > s.locked ? s.locked : done
}

const LOCK_LABEL: Record<string, string> = {
    vesting: 'Vesting',
    validatr: 'Validator stake',
    pyconvot: 'Conviction voting',
}

// a lock the chain gives no block for still ends on something, and vesting and
// the validator stake fall back here when their block is missing
const LOCK_FREED: Record<string, string> = {
    vesting: 'until the schedule finishes paying out',
    validatr: 'until the stake lock expires',
    pyconvot: 'until the votes are removed and the conviction runs out',
}

const HOLD_FREED: Record<string, string> = {
    Preimage: 'until the preimage is unnoted',
}

export interface LockRow {
    kind: 'Frozen' | 'Reserved'
    source: string
    /** The referendum, bounty or account tab the deposit pays for. */
    href?: string
    amount: bigint
    until: number | null
    /** What frees it, where that is a thing that happens rather than a block. */
    freedBy?: string
    /** Whether an ended referendum gives the deposit back. */
    refund?: 'now' | 'never'
    unattributed?: true
}

type DepositOf = Pick<LockRow, 'href' | 'freedBy' | 'refund'>

// every deposit below is the amount the pallet itself filed next to the state it
// paid for, so nothing here recomputes one from the runtime constants
const reserved = (source: string, amount: bigint, of: DepositOf = {}): LockRow => ({kind: 'Reserved', source, amount, until: null, ...of})

const DEPOSIT_LABEL: Record<string, string> = {
    subs: 'Sub identity deposits',
    proxy: 'Proxy deposit',
    announcement: 'Announcement deposit',
    username: 'Username deposits',
}

const DEPOSIT_TAB: Record<string, string> = {
    subs: 'subs',
    proxy: 'proxies',
    announcement: 'proxies',
    username: 'timeline',
}

const DEPOSIT_FREED: Record<string, string> = {
    subs: 'until those subs are dropped',
    proxy: 'until the proxies are removed',
    announcement: 'until the announcements are dispatched or dropped',
    username: 'until those usernames are given up',
}

const CURATOR_FREED = 'until the curator hands the job back'

function depositRows(a: AccountRow, addr: string, s: AccountSummary): LockRow[] {
    const counted: Record<string, number> = {subs: s.nSubs.totalCount, proxy: s.nProxyOut.totalCount}
    return (a.depositsJson ?? []).map(d => {
        const label = DEPOSIT_LABEL[d.id] ?? d.id
        const n = counted[d.id]
        const tab = DEPOSIT_TAB[d.id]
        return reserved(n != null ? `${label} (${n})` : label, BigInt(d.amount), {href: tab && tabHref(addr, tab), freedBy: DEPOSIT_FREED[d.id]})
    })
}

// asking a registrar for judgement puts their fee aside until they answer
function identityRows(a: AccountRow, addr: string, retired: {index: number}[]): LockRow[] {
    const info = a.identityJson as {deposit?: string; judgements?: [number, {__kind: string; value?: string}][]} | null
    if (info == null) return []
    const href = tabHref(addr, 'timeline')
    const rows: LockRow[] = []
    if (info.deposit != null && BigInt(info.deposit) > 0n) {
        rows.push(reserved('Identity deposit', BigInt(info.deposit), {href, freedBy: 'until the identity is cleared'}))
    }
    for (const [index, j] of info.judgements ?? []) {
        if (j.__kind === 'FeePaid' && j.value != null) {
            const amount = BigInt(j.value)
            rows.push(
                retired.some(r => r.index === index)
                    ? reserved(`Retired registrar #${index} judgement fee`, amount, {href, freedBy: 'until the request is withdrawn'})
                    : reserved(`Registrar #${index} judgement fee`, amount, {href, freedBy: 'until the registrar answers or the request is withdrawn'})
            )
        }
    }
    return rows
}

// the money outlives the referendum, so a row stands until someone claims it
// back. pallet_referenda gives a submission deposit back only after an approval
// or a cancellation and a decision deposit after any ending, a kill leaves none
const SUBMISSION_REFUNDED = new Set(['Approved', 'Cancelled'])

/** Whether a deposit still held on an ended referendum can be claimed back. */
export const refundable = (kind: GovDepositRow['kind'], status: string) => kind === 'Decision' || SUBMISSION_REFUNDED.has(status)

function govRows(deposits: GovDepositRow[]): LockRow[] {
    return deposits.map(({kind, amount, referendum: {index, status}}) =>
        reserved(`Referendum #${index} ${kind.toLowerCase()} deposit`, BigInt(amount), {
            href: `/referendum/${index}`,
            ...(status === 'Ongoing' ? {freedBy: 'until claimed back after the referendum ends'} : {refund: refundable(kind, status) ? 'now' : 'never'}),
        })
    )
}

function bountyRows(bounties: BountyDepositRow[], children: ChildBountyDepositRow[], self: string): LockRow[] {
    const rows: LockRow[] = []
    for (const b of bounties) {
        if (b.proposer?.id === self && b.bond != null && BigInt(b.bond) > 0n) {
            rows.push(reserved(`Bounty #${b.index} proposal deposit`, BigInt(b.bond), {href: `/bounty/${b.index}`, freedBy: 'until the bounty is funded or rejected'}))
        }
        if (b.curator?.id === self && b.curatorDeposit != null && BigInt(b.curatorDeposit) > 0n) {
            rows.push(reserved(`Bounty #${b.index} curator deposit`, BigInt(b.curatorDeposit), {href: `/bounty/${b.index}`, freedBy: CURATOR_FREED}))
        }
    }
    for (const c of children) {
        if (c.curatorDeposit != null && BigInt(c.curatorDeposit) > 0n) {
            rows.push(
                reserved(`Child bounty #${c.parent.index}-${c.childIndex} curator deposit`, BigInt(c.curatorDeposit), {
                    href: `/bounty/${c.parent.index}?tab=children`,
                    freedBy: CURATOR_FREED,
                })
            )
        }
    }
    return rows
}

function msigRows(pending: {deposit: string | null}[], addr: string): LockRow[] {
    const total = pending.reduce((n, p) => n + BigInt(p.deposit ?? 0), 0n)
    if (total === 0n) return []
    const freedBy =
        pending.length === 1 ? 'until that call runs or is called off' : `until those ${fmtCount(pending.length, 'call')} run or are called off`
    return [reserved('Multisig deposit', total, {href: tabHref(addr, 'multisig'), freedBy})]
}

// the tab strip needs the count before the tab renders, so the rows are data
// here and the block links go on in the component
export function lockRows(a: AccountRow, addr: string, validator: ValidatorRow | undefined, s: AccountSummary): LockRow[] {
    const vest = schedules(a.vestingJson)
    const vestEnd = vest.length > 0 ? Math.max(...vest.map(v => v.end)) : null
    const frozen: LockRow[] = (a.locksJson ?? []).map(l => ({
        kind: 'Frozen',
        source: LOCK_LABEL[l.id] ?? l.id,
        amount: BigInt(l.amount),
        until: l.id === 'vesting' ? vestEnd : l.id === 'validatr' ? (validator?.lockExpiry ?? null) : null,
        freedBy: LOCK_FREED[l.id],
    }))
    const named: LockRow[] = [
        ...(a.holdsJson ?? []).map(h => {
            const pallet = variantName(h.reason) ?? 'Unknown'
            return reserved(`${pallet} hold`, BigInt(h.amount), {freedBy: HOLD_FREED[pallet]})
        }),
        ...identityRows(a, addr, s.retiredRegistrars),
        ...depositRows(a, addr, s),
        ...govRows(s.govDeposits),
        ...bountyRows(s.bountyDeposits, s.childBountyDeposits, a.id),
        ...msigRows(s.msigPending, addr),
    ]
    const rest = BigInt(a.reserved) - named.reduce((n, r) => n + r.amount, 0n)
    return [
        ...frozen,
        ...named,
        ...(rest > 0n ? ([{kind: 'Reserved', source: 'Unattributed', amount: rest, until: null, unattributed: true}] as LockRow[]) : []),
    ]
}

export interface Role {
    text: string
    tone: BadgeVariant
    /** Lines its tooltip lists. */
    tip?: string[]
}

const refName = (id: string, acc: AccountRef | undefined, chain: ChainProps) => identityLabel(acc) ?? shortAddr(ss58Encode(id, chain.ss58))

// one signer alone can act, or one lost key locks the account
export function multisigRole(s: AccountSummary, refs: Map<string, AccountRef>, chain: ChainProps): Role {
    const set = s.msigSet[0]
    if (set?.signatories == null || set.threshold == null) return {text: 'Multisig', tone: 'idle'}
    const n = set.signatories.length
    return {
        text: `Multisig ${set.threshold}/${n}`,
        tone: set.threshold === 1 || set.threshold === n ? 'warn' : 'idle',
        tip: set.signatories.map(id => refName(id, refs.get(id), chain)),
    }
}

// the accounts that can sign for this one, an Any proxy with no delay takes
// over the moment it wants to
export function controlRoles(s: AccountSummary, refs: Map<string, AccountRef>, chain: ChainProps): Role[] {
    const roles: Role[] = []
    const pure = s.pureCreated[0]
    if (pure) roles.push({text: 'Pure proxy', tone: 'idle', tip: [`Created by ${refName(pure.args.who, refs.get(pure.args.who), chain)} at #${fmtInt(pure.block.height)}`]})
    if (s.proxiesOut.length > 0)
        roles.push({
            text: 'Has proxies',
            tone: s.proxiesOut.some(p => p.proxyType === 'Any' && p.delay === 0) ? 'warn' : 'idle',
            tip: s.proxiesOut.map(p => `${p.proxyType} · ${refName(p.delegatee!.id, p.delegatee, chain)} · ${p.delay > 0 ? `delay ${fmtSpan(p.delay * chain.blockTime)}` : 'no delay'}`),
        })
    return roles
}

/** Accounts the control roles name by id alone, whose identities take a lookup of their own. */
export const controlRefIds = (s: AccountSummary) => [...new Set([...(s.pureCreated[0] ? [s.pureCreated[0].args.who] : []), ...(s.msigSet[0]?.signatories ?? [])])]
