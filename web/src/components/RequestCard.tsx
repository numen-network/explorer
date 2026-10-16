import type {ReactNode} from 'react'
import Link from 'next/link'
import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import AccountLink from '@/components/AccountLink'
import CopyBtn from '@/components/CopyBtn'
import {NONE} from '@/components/Detail'
import {Badge} from '@/components/ui/badge'
import {Button} from '@/components/ui/button'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Collapsible, CollapsibleContent, CollapsibleTrigger} from '@/components/ui/collapsible'
import type {ChainProps} from '@/lib/chain'
import {fmtBalance, fmtCount, fmtInt, fmtSpan, shortHash, truncFixed} from '@/lib/format'
import type {AccountRef, ProposalNode, ReferendumSpendRow} from '@/lib/gql'
import {ss58Encode} from '@/lib/ss58'

const BATCHES = new Set(['Utility.batch', 'Utility.batch_all', 'Utility.force_batch'])

// these tracks run whatever call they are handed, nothing short says it
const ANY_CALL_TRACKS = new Set(['root', 'wish_for_change'])

const PAYOUTS_SHOWN = 5

type Tone = 'pos' | 'warn' | 'neg' | 'idle'
type Row = [label: string, value: ReactNode]
interface Ctx {
    chain: ChainProps
    head: number
    party: Map<string, AccountRef>
    bounties: Map<number, string>
}

const nameOf = (node: ProposalNode) => `${node.pallet}.${node.method}`

// an account named through a lookup, only the plain id variant reads as one
function lookupId(address: unknown): string | null {
    const a = address as {__kind?: string; value?: unknown} | null
    return a?.__kind === 'Id' && typeof a.value === 'string' ? a.value : null
}

function account(id: string, ctx: Ctx) {
    return <AccountLink addr={ss58Encode(id, ctx.chain.ss58)} acc={ctx.party.get(id)} />
}

function referendumLink(index: number) {
    return (
        <Link href={`/referendum/${index}`} className="font-mono text-primary hover:underline">
            #{index}
        </Link>
    )
}

const whole = (planck: string | bigint, chain: ChainProps) => `${fmtInt(truncFixed(planck, 0, chain.decimals))} ${chain.symbol}`

function suffixText(hex: unknown): string | null {
    if (typeof hex !== 'string' || !hex.startsWith('0x')) return null
    return new TextDecoder().decode(hexToBytes(hex.slice(2)))
}

/** What a call asks for in a few rows, null when the call is not one these tracks run or its args do not read. */
function describe(node: ProposalNode, ctx: Ctx): {title: string; rows: Row[]} | null {
    const a = (node.args ?? {}) as Record<string, unknown>
    switch (nameOf(node)) {
        case 'Bounties.approve_bounty':
        case 'Bounties.approve_bounty_with_curator': {
            const value = ctx.bounties.get(node.bounty!)
            const rows: Row[] = [
                [
                    'Bounty',
                    <Link key="b" href={`/bounty/${node.bounty}`} className="font-mono text-primary hover:underline">
                        #{node.bounty}
                    </Link>,
                ],
                ['Value', value != null ? <span className="font-mono">{whole(value, ctx.chain)}</span> : NONE],
            ]
            if (node.method === 'approve_bounty') return {title: 'Approve bounty', rows}
            const curator = lookupId(a.curator)
            if (curator == null) return null
            rows.push(['Curator', account(curator, ctx)], ['Curator fee', <span key="f" className="font-mono">{fmtBalance(String(a.fee), ctx.chain.decimals, ctx.chain.symbol)}</span>])
            return {title: 'Approve bounty', rows}
        }
        case 'Identity.add_registrar': {
            const id = lookupId(a.account)
            return id == null ? null : {title: 'Add registrar', rows: [['Account', account(id, ctx)]]}
        }
        case 'Identity.remove_registrar':
            return {title: 'Remove registrar', rows: [['Registrar', <span key="r" className="font-mono">#{String(a.index)}</span>]]}
        case 'Identity.add_username_authority':
        case 'Identity.remove_username_authority': {
            const id = lookupId(a.authority)
            const suffix = suffixText(a.suffix)
            if (id == null || suffix == null) return null
            const rows: Row[] = [
                ['Authority', account(id, ctx)],
                ['Suffix', <span key="s" className="font-mono">{suffix}</span>],
            ]
            if (node.method === 'remove_username_authority') return {title: 'Remove username authority', rows}
            rows.push(['Allocation', <span key="n" className="font-mono">{fmtInt(Number(a.allocation))}</span>])
            return {title: 'Add username authority', rows}
        }
        case 'Referenda.cancel':
            return {title: 'Cancel referendum', rows: [['Referendum', referendumLink(Number(a.index))]]}
        case 'Referenda.kill':
            return {title: 'Kill referendum', rows: [['Referendum', referendumLink(Number(a.index))]]}
        case 'Prime.upgrade': {
            if (typeof a.code !== 'string' || !a.code.startsWith('0x')) return null
            const code = hexToBytes(a.code.slice(2))
            const hash = '0x' + bytesToHex(blake2b(code, {dkLen: 32}))
            return {
                title: 'Upgrade runtime',
                rows: [
                    [
                        'Code hash',
                        <span key="h" className="inline-flex items-center gap-1">
                            <span className="font-mono">{shortHash(hash)}</span>
                            <CopyBtn text={hash} />
                        </span>,
                    ],
                    ['Size', <span key="z" className="font-mono">{fmtCount(code.length, 'byte')}</span>],
                ],
            }
        }
    }
    return null
}

// how long until a block, and the block itself
const until = (block: number, head: number, blockTime: number) => `${fmtSpan((block - head) * blockTime)} · #${fmtInt(block)}`

// a spend the chain still holds back says how long is left on it, spend_local
// has no window and goes out with the treasury's next spend period
function release(node: ProposalNode, head: number, blockTime: number): string {
    if (node.method === 'spend_local') return 'Next spend period'
    if (node.validFrom == null) return 'Immediately'
    if (node.validFrom <= head) return `Immediately · #${fmtInt(node.validFrom)}`
    return `In ${until(node.validFrom, head, blockTime)}`
}

// where a payout stands once the enactment ran, Paid and an expiry both end in
// SpendProcessed and only a Paid before it tells them apart
function payoutState(spend: ReferendumSpendRow | undefined, ctx: Ctx): {label: string; tone: Tone; note?: string} {
    if (spend == null) return {label: 'Not created', tone: 'neg'}
    const left = (block: number) => until(block, ctx.head, ctx.chain.blockTime)
    switch (spend.status) {
        case 'SpendApproved':
            return {label: 'Approved', tone: 'warn', note: 'Next spend period'}
        case 'Awarded':
        case 'Paid':
            return {label: 'Paid', tone: 'pos'}
        case 'PaymentFailed':
            return {label: 'Failed', tone: 'neg'}
        case 'AssetSpendVoided':
            return {label: 'Voided', tone: 'neg'}
        case 'SpendProcessed':
            return spend.paidAt != null ? {label: 'Paid', tone: 'pos'} : {label: 'Expired', tone: 'neg'}
    }
    if (spend.expireAt != null && spend.expireAt <= ctx.head) return {label: 'Expired', tone: 'neg'}
    if (spend.validFrom != null && spend.validFrom > ctx.head) return {label: 'Pending', tone: 'idle', note: `Claimable in ${left(spend.validFrom)}`}
    return {label: 'Claimable', tone: 'warn', note: spend.expireAt != null ? `Expires in ${left(spend.expireAt)}` : undefined}
}

function Payout({node, spend, enacted, ctx}: {node: ProposalNode; spend: ReferendumSpendRow | undefined; enacted: boolean; ctx: Ctx}) {
    const state = enacted ? payoutState(spend, ctx) : null
    const note = state ? state.note : release(node, ctx.head, ctx.chain.blockTime)
    return (
        <div className="border-t py-2">
            <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 truncate">{account(node.beneficiary!, ctx)}</span>
                <span className="font-mono font-semibold whitespace-nowrap">{whole(node.amount!, ctx.chain)}</span>
            </div>
            <div className="mt-1 flex items-center gap-2 text-xs text-dim">
                {state && <Badge variant={state.tone}>{state.label}</Badge>}
                {note}
            </div>
        </div>
    )
}

function Heading({title, aside}: {title: string; aside?: string}) {
    return (
        <div className="flex items-baseline justify-between gap-3 pb-2.5">
            <span className="text-base font-semibold">{title}</span>
            {aside && <span className="text-xs whitespace-nowrap text-dim">{aside}</span>}
        </div>
    )
}

function Rows({rows}: {rows: Row[]}) {
    return rows.map(([label, value]) => (
        <div key={label} className="flex items-baseline justify-between gap-3 border-t py-2.5">
            <span className="shrink-0 text-muted-foreground">{label}</span>
            <span className="min-w-0 text-right">{value}</span>
        </div>
    ))
}

function SeeCall({index}: {index: number}) {
    return (
        <Link href={`/referendum/${index}?tab=call`} className="text-primary hover:underline">
            See call
        </Link>
    )
}

function Spends({items, spends, enacted, ctx}: {items: [number, ProposalNode][]; spends: Map<number, ReferendumSpendRow>; enacted: boolean; ctx: Ctx}) {
    const total = items.reduce((sum, [, node]) => sum + BigInt(node.amount!), 0n)
    const payout = ([at, node]: [number, ProposalNode]) => <Payout key={at} node={node} spend={spends.get(at)} enacted={enacted} ctx={ctx} />
    return (
        <div>
            <Heading title="Treasury spend" aside={items.length > 1 ? fmtCount(items.length, 'payout') : undefined} />
            {items.length > 1 && <Rows rows={[['Total', <span key="t" className="font-mono font-semibold">{whole(total, ctx.chain)}</span>]]} />}
            {items.slice(0, PAYOUTS_SHOWN).map(payout)}
            {items.length > PAYOUTS_SHOWN && (
                <Collapsible className="group">
                    <CollapsibleContent>{items.slice(PAYOUTS_SHOWN).map(payout)}</CollapsibleContent>
                    <div className="border-t pt-2.5 group-data-[state=open]:hidden">
                        <CollapsibleTrigger asChild>
                            <Button variant="outline" size="sm" className="w-full bg-background text-muted-foreground">
                                Show all {items.length}
                            </Button>
                        </CollapsibleTrigger>
                    </div>
                </Collapsible>
            )}
        </div>
    )
}

/** Every account the request names, so their identities can be looked up beforehand. */
export function requestAccounts(nodes: ProposalNode[]): string[] {
    return nodes.flatMap(node => {
        const a = (node.args ?? {}) as Record<string, unknown>
        return [node.beneficiary ?? null, lookupId(a.account), lookupId(a.authority), lookupId(a.curator)].filter((id): id is string => id != null)
    })
}

/**
 * What a referendum asks for, read off its proposal call by call. A batch
 * stands for its calls, spends gather under one heading, and a call these
 * tracks are not meant to run sends the reader to the call itself.
 */
export function RequestCard(props: {
    index: number
    track: string
    nodes: ProposalNode[]
    spends: ReferendumSpendRow[]
    enacted: boolean
    chain: ChainProps
    head: number
    party: Map<string, AccountRef>
    bounties: Map<number, string>
}) {
    const {index, nodes, enacted} = props
    const ctx: Ctx = {chain: props.chain, head: props.head, party: props.party, bounties: props.bounties}
    // a batch with nothing read under it is a call of its own
    const leaves = nodes.map((node, at) => [at, node] as [number, ProposalNode]).filter(([at, node]) => !BATCHES.has(nameOf(node)) || (nodes[at + 1]?.address.length ?? 0) <= node.address.length)
    const payouts = leaves.filter(([, node]) => node.amount != null)
    const described = leaves.filter(([, node]) => node.amount == null).map(([at, node]) => [at, describe(node, ctx)] as const)
    const known = described.filter((d): d is [number, {title: string; rows: Row[]}] => d[1] != null)
    const others = described.length - known.length
    const spendAt = new Map(props.spends.filter(s => s.proposalCall != null).map(s => [s.proposalCall!, s]))

    let body: ReactNode
    if (nodes.length === 0) body = NONE
    else if (ANY_CALL_TRACKS.has(props.track) || payouts.length + known.length === 0) body = <SeeCall index={index} />
    else
        body = (
            <div className="space-y-4">
                {payouts.length > 0 && <Spends items={payouts} spends={spendAt} enacted={enacted} ctx={ctx} />}
                {known.map(([at, {title, rows}]) => (
                    <div key={at}>
                        <Heading title={title} />
                        <Rows rows={rows} />
                    </div>
                ))}
                {others > 0 && <Rows rows={[[fmtCount(others, 'other call'), <SeeCall key="c" index={index} />]]} />}
            </div>
        )

    return (
        <Card className="gap-3 py-4 [--card-spacing:--spacing(5)]">
            <CardHeader>
                <CardTitle className="text-[15px] leading-normal font-semibold">Request</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">{body}</CardContent>
        </Card>
    )
}
