import type {ChainProps} from '@/lib/chain'
import type {AccountRow, AccountSummary, BountyDepositRow, ChildBountyDepositRow, GovDepositRow, ValidatorRow} from '@/lib/gql'

export interface TabCtx {
    hex: string
    addr: string
    // how this account reads when a row points back at itself
    label: string
    chain: ChainProps
    sp: Record<string, string | string[] | undefined>
}

export const NONE = <span className="text-faint">—</span>

export const JUDGEMENT_TONE: Record<string, 'pos' | 'warn' | 'neg' | 'idle'> = {
    KnownGood: 'pos',
    Reasonable: 'pos',
    OutOfDate: 'warn',
    FeePaid: 'idle',
    Unknown: 'idle',
    LowQuality: 'neg',
    Erroneous: 'neg',
}

export const trackLabel = (name: string) => name.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ')

export const num = (sp: TabCtx['sp'], key: string) => Math.max(1, Number(sp[key]) || 1)

// a pager or a filter inside a tab has to carry the tab along, otherwise the
// next click drops the reader back on the first one
export function tabHref(addr: string, tab: string, extra: Record<string, string | number> = {}) {
    const q = new URLSearchParams({tab})
    for (const [k, v] of Object.entries(extra)) if (v !== '') q.set(k, String(v))
    return `/account/${addr}?${q}`
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
    amount: bigint
    until: number | null
    /** What frees it, where that is a thing that happens rather than a block. */
    freedBy?: string
    unattributed?: true
}

// every deposit below is the amount the pallet itself filed next to the state it
// paid for, so nothing here recomputes one from the runtime constants
const reserved = (source: string, amount: bigint, freedBy?: string): LockRow => ({kind: 'Reserved', source, amount, until: null, freedBy})

const DEPOSIT_LABEL: Record<string, string> = {
    subs: 'Sub identity deposits',
    proxy: 'Proxy deposit',
    announcement: 'Announcement deposit',
    username: 'Username deposits',
}

const DEPOSIT_FREED: Record<string, string> = {
    subs: 'until those subs are dropped',
    proxy: 'until the proxies are removed',
    announcement: 'until the announcements are dispatched or dropped',
    username: 'until those usernames are given up',
}

const CURATOR_FREED = 'until the curator hands the job back'

function depositRows(a: AccountRow, s: AccountSummary): LockRow[] {
    const counted: Record<string, number> = {subs: s.nSubs.totalCount, proxy: s.nProxyOut.totalCount}
    return (a.depositsJson ?? []).map(d => {
        const label = DEPOSIT_LABEL[d.id] ?? d.id
        const n = counted[d.id]
        return reserved(n != null ? `${label} (${n})` : label, BigInt(d.amount), DEPOSIT_FREED[d.id])
    })
}

// asking a registrar for judgement puts their fee aside until they answer
function identityRows(a: AccountRow): LockRow[] {
    const info = a.identityJson as {deposit?: string; judgements?: [number, {__kind: string; value?: string}][]} | null
    if (info == null) return []
    const rows: LockRow[] = []
    if (info.deposit != null && BigInt(info.deposit) > 0n) {
        rows.push(reserved('Identity deposit', BigInt(info.deposit), 'until the identity is cleared'))
    }
    for (const [index, j] of info.judgements ?? []) {
        if (j.__kind === 'FeePaid' && j.value != null) {
            rows.push(reserved(`Registrar #${index} judgement fee`, BigInt(j.value), 'until the registrar answers or the request is withdrawn'))
        }
    }
    return rows
}

// the money outlives the referendum, so a row stands until the depositor claims
// it back
function govRows(deposits: GovDepositRow[], self: string): LockRow[] {
    const rows: LockRow[] = []
    const row = (index: number, what: string, amount: string) =>
        reserved(`Referendum #${index} ${what} deposit`, BigInt(amount), 'until claimed back after the referendum ends')
    for (const d of deposits) {
        if (d.submissionDepositor === self && d.submissionDeposit != null) rows.push(row(d.index, 'submission', d.submissionDeposit))
        if (d.decisionDepositor === self && d.decisionDeposit != null) rows.push(row(d.index, 'decision', d.decisionDeposit))
    }
    return rows
}

function bountyRows(bounties: BountyDepositRow[], children: ChildBountyDepositRow[], self: string): LockRow[] {
    const rows: LockRow[] = []
    for (const b of bounties) {
        if (b.proposer?.id === self && b.bond != null && BigInt(b.bond) > 0n) {
            rows.push(reserved(`Bounty #${b.index} proposal deposit`, BigInt(b.bond), 'until the bounty is funded or rejected'))
        }
        if (b.curator?.id === self && b.curatorDeposit != null && BigInt(b.curatorDeposit) > 0n) {
            rows.push(reserved(`Bounty #${b.index} curator deposit`, BigInt(b.curatorDeposit), CURATOR_FREED))
        }
    }
    for (const c of children) {
        if (c.curatorDeposit != null && BigInt(c.curatorDeposit) > 0n) {
            rows.push(reserved(`Child bounty #${c.parent.index}-${c.childIndex} curator deposit`, BigInt(c.curatorDeposit), CURATOR_FREED))
        }
    }
    return rows
}

function msigRows(pending: {deposit: string | null}[]): LockRow[] {
    const total = pending.reduce((n, p) => n + BigInt(p.deposit ?? 0), 0n)
    if (total === 0n) return []
    const freedBy =
        pending.length === 1 ? 'until that call runs or is called off' : `until those ${pending.length} calls run or are called off`
    return [reserved('Multisig deposit', total, freedBy)]
}

// the tab strip needs the count before the tab renders, so the rows are data
// here and the block links go on in the component
export function lockRows(a: AccountRow, validator: ValidatorRow | undefined, s: AccountSummary): LockRow[] {
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
        ...(a.holdsJson ?? []).map(h => reserved(`${h.id} hold`, BigInt(h.amount), HOLD_FREED[h.id])),
        ...identityRows(a),
        ...depositRows(a, s),
        ...govRows(s.govDeposits, a.id),
        ...bountyRows(s.bountyDeposits, s.childBountyDeposits, a.id),
        ...msigRows(s.msigPending),
    ]
    const rest = BigInt(a.reserved) - named.reduce((n, r) => n + r.amount, 0n)
    return [
        ...frozen,
        ...named,
        ...(rest > 0n ? ([{kind: 'Reserved', source: 'Unattributed', amount: rest, until: null, unattributed: true}] as LockRow[]) : []),
    ]
}
