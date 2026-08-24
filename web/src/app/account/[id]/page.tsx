import Link from 'next/link'
import type {ReactNode} from 'react'
import {notFound} from 'next/navigation'
import CopyBtn from '@/components/CopyBtn'
import {AddrMark} from '@/components/addrHot'
import {DetailCard, DetailRow} from '@/components/Detail'
import {TabBar} from '@/components/Tabs'
import {BlockLink} from '@/components/links'
import {Tag} from '@/components/pills'
import Delegations from '@/components/account/Delegations'
import Extrinsics from '@/components/account/Extrinsics'
import Identity from '@/components/account/Identity'
import Judgements from '@/components/account/Judgements'
import Locks from '@/components/account/Locks'
import Mining from '@/components/account/Mining'
import Multisig from '@/components/account/Multisig'
import Proxies from '@/components/account/Proxies'
import Subs from '@/components/account/Subs'
import Timeline from '@/components/account/Timeline'
import TokenTransfers from '@/components/account/TokenTransfers'
import Transfers from '@/components/account/Transfers'
import Validator from '@/components/account/Validator'
import Vesting from '@/components/account/Vesting'
import Votes from '@/components/account/Votes'
import {lockRows, schedules, tabHref, type TabCtx} from '@/components/account/shared'
import {chainProps} from '@/lib/chain'
import {fmtAge, fmtBalance, fmtInt, shortHash} from '@/lib/format'
import {accountSummary, blockTimes, evmDeployments, tokenTransferCount} from '@/lib/gql'
import {identityLabel} from '@/lib/identity'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'

export const dynamic = 'force-dynamic'

const sat = (v: bigint) => (v > 0n ? v : 0n)
const bigMax = (a: bigint, b: bigint) => (a > b ? a : b)
// a lock this size means everything is locked, polkadot.js leaves it out of the total
const MAX_U128 = (1n << 128n) - 1n

export async function generateMetadata(props: PageProps<'/account/[id]'>) {
    const {id} = await props.params
    return {title: `Account ${shortHash(id, 8, 6)}`}
}

// a tab is only built when the reader is on it, so the page runs one tab query
// instead of one per tab. group ties the sub tabs to the strip above them
interface Tab {
    slug: string
    label: string
    count?: number
    group?: string
    body: () => ReactNode
}

export default async function AccountPage(props: PageProps<'/account/[id]'>) {
    const {id: raw} = await props.params
    const chain = await chainProps()
    const hex = /^0x[0-9a-fA-F]{64}$/.test(raw) ? raw.toLowerCase() : ss58TryDecode(raw, chain.ss58)
    if (!hex) notFound()
    const addr = ss58Encode(hex, chain.ss58)

    const sp = await props.searchParams
    const s = await accountSummary(hex)
    const a = s.accountById
    if (!a) notFound()

    const [firstSeen, evm, nTokens] = await Promise.all([
        blockTimes([a.firstSeenBlock]).then(r => r.blocks[0]),
        a.evmAddress ? evmDeployments(a.evmAddress) : {contracts: 0, tokens: 0},
        a.evmAddress ? tokenTransferCount(a.evmAddress) : 0,
    ])

    const ctx: TabCtx = {hex, addr, label: identityLabel(a) ?? shortHash(addr, 8, 6), chain, sp}
    const validator = s.validators[0]
    const minedBlocks = s.minerDays.reduce((n, d) => n + d.blocks, 0)
    const locks = lockRows(a, validator, s)
    const vest = schedules(a.vestingJson)
    const registrar = s.registrar[0]
    const hasIdentity = a.identityJson != null || a.identitySuper != null

    // polkadot.js formula. frozen is a floor on the total rather than a bucket of
    // its own, so reserved counts towards it, and an account that reserves or
    // freezes anything has a reference keeping it alive and must retain the ED
    const free = BigInt(a.free)
    const reserved = BigInt(a.reserved)
    const frozen = BigInt(a.frozen)
    const ed = frozen === 0n && reserved === 0n ? 0n : BigInt(chain.existentialDeposit)
    const transferable = sat(free - bigMax(ed, frozen - reserved))
    // the biggest lock rather than the frozen field, which also answers to freezes
    const locked = (a.locksJson ?? []).reduce((m, l) => {
        const v = BigInt(l.amount)
        return v !== MAX_U128 && v > m ? v : m
    }, 0n)

    const roles: {text: string; tone: 'pos' | 'warn' | 'neg' | 'idle' | 'accent'}[] = []
    if (s.prime.length > 0) roles.push({text: 'Prime', tone: 'warn'})
    if (validator) roles.push({text: validator.active ? 'Active validator' : 'Validator', tone: validator.active ? 'pos' : 'idle'})
    if (minedBlocks > 0) roles.push({text: 'Miner', tone: 'accent'})
    if (registrar) roles.push({text: `Registrar #${registrar.index}`, tone: 'accent'})
    if (evm.tokens > 0) roles.push({text: evm.tokens > 1 ? `Token issuer · ${evm.tokens}` : 'Token issuer', tone: 'accent'})
    if (evm.contracts > evm.tokens) roles.push({text: 'Contract deployer', tone: 'idle'})
    if (s.curated.totalCount + s.childCurated.totalCount > 0) roles.push({text: 'Bounty curator', tone: 'idle'})
    if (s.nDelegIn.totalCount > 0) roles.push({text: 'Delegate', tone: 'idle'})
    if (s.nMultisigSelf.totalCount > 0) roles.push({text: 'Multisig', tone: 'idle'})
    if (s.nProxyIn.totalCount > 0) roles.push({text: 'Proxy', tone: 'idle'})

    const tabs: Tab[] = [{slug: 'transfers', label: 'Native', group: 'Transfers', count: s.nTransfers.totalCount, body: () => <Transfers {...ctx} />}]
    if (a.evmAddress) tabs.push({slug: 'tokens', label: 'Tokens', group: 'Transfers', count: nTokens, body: () => <TokenTransfers {...ctx} evm={a.evmAddress!} />})
    tabs.push({slug: 'extrinsics', label: 'Extrinsics', count: s.nExtrinsics.totalCount, body: () => <Extrinsics {...ctx} />})
    if (locks.length > 0) tabs.push({slug: 'locks', label: 'Locks', count: locks.length, body: () => <Locks rows={locks} chain={chain} />})
    if (vest.length > 0) tabs.push({slug: 'vesting', label: 'Vesting', count: vest.length, body: () => <Vesting vest={vest} chain={chain} />})
    // an account that cleared its identity keeps every event it ever raised, so
    // the tab answers to its own rows rather than to the identity standing now
    if (s.nTimeline.totalCount > 0)
        tabs.push({slug: 'timeline', label: 'Timeline', group: 'Identity', count: s.nTimeline.totalCount, body: () => <Timeline {...ctx} />})
    if (s.nSubs.totalCount > 0) tabs.push({slug: 'subs', label: 'Sub identities', group: 'Identity', count: s.nSubs.totalCount, body: () => <Subs {...ctx} />})
    if (registrar)
        tabs.push({slug: 'judgements', label: 'Judgements Given', group: 'Identity', count: s.nJudged.totalCount, body: () => <Judgements {...ctx} index={registrar.index} />})
    if (validator) tabs.push({slug: 'validator', label: 'Validator', body: () => <Validator v={validator} chain={chain} />})
    if (minedBlocks > 0) tabs.push({slug: 'mining', label: 'Mining', count: minedBlocks, body: () => <Mining days={s.minerDays} />})
    if (s.nDelegOut.totalCount + s.nDelegIn.totalCount > 0)
        tabs.push({slug: 'delegations', label: 'Delegations', count: s.nDelegOut.totalCount + s.nDelegIn.totalCount, body: () => <Delegations {...ctx} />})
    if (s.nProxyOut.totalCount + s.nProxyIn.totalCount > 0)
        tabs.push({slug: 'proxies', label: 'Proxies', count: s.nProxyOut.totalCount + s.nProxyIn.totalCount, body: () => <Proxies {...ctx} />})
    if (s.nMultisig.totalCount > 0) tabs.push({slug: 'multisig', label: 'Multisig', count: s.nMultisig.totalCount, body: () => <Multisig {...ctx} />})
    if (s.nVotes.totalCount > 0) tabs.push({slug: 'votes', label: 'Governance votes', count: s.nVotes.totalCount, body: () => <Votes {...ctx} />})

    const active = tabs.find(t => t.slug === sp.tab) ?? tabs[0]
    const groups = [...new Set(tabs.map(t => t.group ?? t.label))]
    const siblings = active.group ? tabs.filter(t => t.group === active.group) : []

    return (
        <div>
            <div className="mt-6">
                <h1 className="text-lg font-semibold">Account</h1>
                <div className="mt-1.5 font-mono text-[15px] break-all">
                    <AddrMark addr={addr}>{addr}</AddrMark>
                    <CopyBtn text={addr} />
                </div>
                {roles.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        {roles.map(r => (
                            <Tag key={r.text} text={r.text} tone={r.tone} />
                        ))}
                    </div>
                )}
            </div>

            <div className={`mt-4 grid items-start gap-4 ${hasIdentity ? 'lg:grid-cols-2' : ''}`}>
                <div>
                    <DetailCard>
                        <DetailRow label="Balance">{fmtBalance(free + reserved, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Transferable *">{fmtBalance(transferable, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Locked *">{fmtBalance(locked, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Free">{fmtBalance(free, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Reserved">{fmtBalance(reserved, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Frozen">{fmtBalance(frozen, chain.decimals, chain.symbol)}</DetailRow>
                        <DetailRow label="Nonce">{fmtInt(a.nonce)}</DetailRow>
                        <DetailRow label="First seen">
                            <BlockLink height={a.firstSeenBlock} />
                            {firstSeen && <span className="ml-3 text-xs text-faint">active age {fmtAge(firstSeen.timestamp)}</span>}
                        </DetailRow>
                        <DetailRow label="Last active">
                            <BlockLink height={a.lastActiveBlock} />
                        </DetailRow>
                        {a.evmAddress && (
                            <DetailRow label="EVM origin">
                                <Link href={`/evm/address/${a.evmAddress}`} className="text-accent hover:underline">
                                    {a.evmAddress}
                                </Link>
                                <span className="ml-2 text-xs text-faint">mapped account of this H160</span>
                            </DetailRow>
                        )}
                    </DetailCard>
                    <div className="mt-2 px-1 text-xs text-faint">* computed from on-chain data, not raw on-chain data</div>
                </div>
                {hasIdentity && <Identity a={a} chain={chain} />}
            </div>

            <div className="mt-7">
                <TabBar
                    items={groups.map(g => {
                        const members = tabs.filter(t => (t.group ?? t.label) === g)
                        const counted = members.filter(t => t.count != null)
                        return {
                            label: g,
                            count: counted.length > 0 ? counted.reduce((n, t) => n + t.count!, 0) : undefined,
                            href: tabHref(addr, members[0].slug),
                            active: (active.group ?? active.label) === g,
                        }
                    })}
                />
                {siblings.length > 0 && (
                    <div className="mt-4">
                        <TabBar items={siblings.map(t => ({label: t.label, count: t.count, href: tabHref(addr, t.slug), active: t.slug === active.slug}))} />
                    </div>
                )}
                <div className="mt-4">{active.body()}</div>
            </div>
        </div>
    )
}
