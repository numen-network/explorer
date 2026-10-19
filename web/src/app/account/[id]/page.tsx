import Link from 'next/link'
import {notFound} from 'next/navigation'
import Balance from '@/components/Balance'
import {AmountGroup, AmountRow, AmountRows, DetailCard, DetailRow} from '@/components/Detail'
import {TabBar, type Panel} from '@/components/Tabs'
import {TimeCell} from '@/components/TimeCell'
import {BlockLink} from '@/components/links'
import BalanceBar from '@/components/account/BalanceBar'
import Charts from '@/components/account/Charts'
import Counterparties from '@/components/account/Counterparties'
import Delegations from '@/components/account/Delegations'
import DelegationHistory from '@/components/account/DelegationHistory'
import Extrinsics from '@/components/account/Extrinsics'
import Header from '@/components/account/Header'
import Holdings from '@/components/account/Holdings'
import Identity from '@/components/account/Identity'
import Judgements from '@/components/account/Judgements'
import Locks from '@/components/account/Locks'
import Mining from '@/components/account/Mining'
import {MultisigAddress, MultisigSignatory} from '@/components/account/Multisig'
import Proposed from '@/components/account/Proposed'
import Proxies from '@/components/account/Proxies'
import Received from '@/components/account/Received'
import Subs from '@/components/account/Subs'
import Timeline from '@/components/account/Timeline'
import TokenTransfers from '@/components/account/TokenTransfers'
import Transfers from '@/components/account/Transfers'
import Treasury from '@/components/account/Treasury'
import Validator from '@/components/account/Validator'
import Vesting from '@/components/account/Vesting'
import Votes from '@/components/account/Votes'
import VoteHistory from '@/components/account/VoteHistory'
import {controlRefIds, controlRoles, lockRows, multisigRole, schedules, tabHref, type Role, type TabCtx} from '@/components/account/shared'
import {chainProps} from '@/lib/chain'
import {shortAddr} from '@/components/AddressText'
import {votesPower} from '@/lib/conviction'
import {fmtInt, fmtPct} from '@/lib/format'
import {accountRefs, accountSummary, blockTime, evmCounts, type AccountRef} from '@/lib/gql'
import {ss58Encode, ss58TryDecode} from '@/lib/ss58'
import {PRIME, TREASURY} from '@/lib/wellKnown'

export const dynamic = 'force-dynamic'

const sat = (v: bigint) => (v > 0n ? v : 0n)
const bigMax = (a: bigint, b: bigint) => (a > b ? a : b)

// a url names the account by its ss58 address or its 32 byte hex id
const accountHex = (raw: string, ss58: number) => (/^0x[0-9a-fA-F]{64}$/.test(raw) ? raw.toLowerCase() : ss58TryDecode(raw, ss58))

export async function generateMetadata(props: PageProps<'/account/[id]'>) {
    const {id} = await props.params
    const {ss58} = await chainProps()
    const hex = accountHex(id, ss58)
    return {title: `Account ${shortAddr(hex ? ss58Encode(hex, ss58) : id)}`}
}

// a tab is only built when the reader is on it, so the page runs one tab query
// instead of one per tab. group ties the sub tabs to the strip above them
interface Tab extends Panel {
    group?: string
}

export default async function AccountPage(props: PageProps<'/account/[id]'>) {
    const {id: raw} = await props.params
    const chain = await chainProps()
    const hex = accountHex(raw, chain.ss58)
    if (!hex) notFound()
    const addr = ss58Encode(hex, chain.ss58)

    const sp = await props.searchParams
    const s = await accountSummary(hex)
    const a = s.accountById
    if (!a) notFound()

    const refIds = controlRefIds(s)
    const [evm, lastActiveTime, refs] = await Promise.all([
        a.evmAddress ? evmCounts(a.evmAddress) : {transfers: 0, holdings: 0, contracts: 0, tokens: 0},
        a.lastActiveBlock != null ? blockTime(a.lastActiveBlock) : null,
        refIds.length > 0 ? accountRefs(refIds).then(r => new Map(r.accounts.map(acc => [acc.id, acc]))) : new Map<string, AccountRef>(),
    ])

    const ctx: TabCtx = {hex, addr, chain, sp}
    const validator = s.validators[0]
    const minedBlocks = s.nMined.totalCount
    const locks = lockRows(a, addr, validator, s)
    const vest = schedules(a.vestingJson)
    const registrar = s.registrar[0]
    const hasIdentity = a.identityJson != null || a.identitySuper != null || a.username != null

    // polkadot.js formula. frozen is a floor on the total rather than a bucket of
    // its own, so reserved counts towards it, and an account that reserves or
    // freezes anything has a reference keeping it alive and must retain the ED
    const free = BigInt(a.free)
    const reserved = BigInt(a.reserved)
    const frozen = BigInt(a.frozen)
    const ed = frozen === 0n && reserved === 0n ? 0n : BigInt(chain.existentialDeposit)
    const transferable = sat(free - bigMax(ed, frozen - reserved))
    const locked = BigInt(a.balance) - transferable
    const share = (part: bigint) => (a.balance === '0' ? undefined : fmtPct(part, a.balance))

    const power = votesPower(a.balance, s.delegationsIn)

    const roles: Role[] = []
    if (hex === chain.treasuryAccount) roles.push({text: TREASURY.label, tone: 'primary'})
    if (s.prime.length > 0) roles.push({text: PRIME.label, tone: 'warn'})
    if (validator) roles.push({text: validator.active ? 'Active validator' : 'Validator', tone: validator.active ? 'pos' : 'idle'})
    if (minedBlocks > 0) roles.push({text: 'Miner', tone: 'primary'})
    if (registrar) roles.push({text: `Registrar #${registrar.index}`, tone: 'primary'})
    if (evm.tokens > 0) roles.push({text: evm.tokens > 1 ? `Token issuer · ${fmtInt(evm.tokens)}` : 'Token issuer', tone: 'primary'})
    if (evm.contracts > evm.tokens) roles.push({text: 'Contract deployer', tone: 'idle'})
    if (s.nTreasuryBeneficiary.totalCount > 0) roles.push({text: 'Treasury beneficiary', tone: 'idle'})
    if (s.curated.totalCount + s.childCurated.totalCount > 0) roles.push({text: 'Bounty curator', tone: 'idle'})
    if (s.nDelegIn.totalCount > 0) roles.push({text: 'Delegate', tone: 'idle'})
    if (s.multisigById) roles.push(multisigRole(s.multisigById, refs, chain))
    if (s.nProxyIn.totalCount > 0) roles.push({text: 'Proxy', tone: 'idle'})
    roles.push(...controlRoles(s, refs, chain))

    const tabs: Tab[] = [{slug: 'transfers', label: 'Native', group: 'Transfers', count: s.nTransfers.totalCount, body: () => <Transfers {...ctx} />}]
    if (a.evmAddress) tabs.push({slug: 'tokens', label: 'Tokens', group: 'Transfers', count: evm.transfers, body: () => <TokenTransfers {...ctx} evm={a.evmAddress!} />})
    if (s.nTransfers.totalCount + evm.transfers > 0) tabs.push({slug: 'counterparties', label: 'Counterparties', group: 'Transfers', body: () => <Counterparties {...ctx} evm={a.evmAddress} native={s.nTransfers.totalCount > 0} />})
    if (evm.holdings > 0) tabs.push({slug: 'holdings', label: 'Tokens', count: evm.holdings, body: () => <Holdings {...ctx} evm={a.evmAddress!} />})
    tabs.push({slug: 'extrinsics', label: 'Extrinsics', count: s.nExtrinsics.totalCount, body: () => <Extrinsics {...ctx} />})
    if (locks.length > 0) tabs.push({slug: 'locks', label: 'Locks', count: locks.length, body: () => <Locks rows={locks} chain={chain} />})
    if (vest.length > 0) tabs.push({slug: 'vesting', label: 'Vesting', count: vest.length, body: () => <Vesting vest={vest} inLock={BigInt(a.locksJson?.find(l => l.id === 'vesting')?.amount ?? 0)} chain={chain} />})
    // an account that cleared its identity keeps every event it ever raised, so
    // the tab answers to its own rows rather than to the identity standing now
    if (s.nTimeline.totalCount > 0)
        tabs.push({slug: 'timeline', label: 'Timeline', group: 'Identity', count: s.nTimeline.totalCount, body: () => <Timeline {...ctx} />})
    if (s.nSubs.totalCount > 0) tabs.push({slug: 'subs', label: 'Sub identities', group: 'Identity', count: s.nSubs.totalCount, body: () => <Subs {...ctx} />})
    if (registrar)
        tabs.push({slug: 'judgements', label: 'Judgements Given', group: 'Identity', count: s.nJudged.totalCount, body: () => <Judgements {...ctx} index={registrar.index} />})
    if (validator) tabs.push({slug: 'validator', label: 'Validator', body: () => <Validator v={validator} chain={chain} />})
    if (minedBlocks > 0) tabs.push({slug: 'mining', label: 'Mining', count: minedBlocks, body: () => <Mining {...ctx} days={s.minerDays} total={minedBlocks} />})
    if (s.nProxyOut.totalCount + s.nProxyIn.totalCount > 0)
        tabs.push({slug: 'proxies', label: 'Proxies', count: s.nProxyOut.totalCount + s.nProxyIn.totalCount, body: () => <Proxies {...ctx} />})
    const msig = s.multisigById
    if (msig) tabs.push({slug: 'multisig', label: 'As a multisig address', group: 'Multisig', count: msig.operations, body: () => <MultisigAddress {...ctx} set={msig} />})
    if (s.nMultisigSigner.totalCount > 0)
        tabs.push({slug: 'multisig-signatory', label: 'As a multisig signatory', group: 'Multisig', count: s.nMultisigSigner.totalCount, body: () => <MultisigSignatory {...ctx} operations={s.nMultisigSigner.totalCount} memberships={s.nMemberships.totalCount} />})
    if (s.nVotes.totalCount > 0) tabs.push({slug: 'votes', label: 'Votes', group: 'Governance', count: s.nVotes.totalCount, body: () => <Votes {...ctx} firstSeenBlock={a.firstSeenBlock} locked={a.locksJson?.find(l => l.id === 'pyconvot')?.amount ?? '0'} />})
    if (s.nVoteHistory.totalCount > 0)
        tabs.push({slug: 'vote-history', label: 'Vote history', group: 'Governance', count: s.nVoteHistory.totalCount, body: () => <VoteHistory {...ctx} />})
    if (s.nProposed.totalCount > 0) tabs.push({slug: 'proposed', label: 'Proposed', group: 'Governance', count: s.nProposed.totalCount, body: () => <Proposed {...ctx} />})
    if (s.nTreasury.totalCount > 0) tabs.push({slug: 'treasury', label: 'Treasury', group: 'Governance', count: s.nTreasury.totalCount, body: () => <Treasury {...ctx} />})
    if (s.nDelegIn.totalCount > 0)
        tabs.push({slug: 'received', label: 'Received', group: 'Governance', count: s.nDelegIn.totalCount, body: () => <Received {...ctx} delegations={s.delegationsIn} total={s.nDelegIn.totalCount} maxDelegations={power.maxDelegations} />})
    if (s.nReceivedHistory.totalCount > 0)
        tabs.push({slug: 'received-history', label: 'Received history', group: 'Governance', count: s.nReceivedHistory.totalCount, body: () => <DelegationHistory {...ctx} dir="in" slug="received-history" />})
    if (s.nDelegOut.totalCount > 0) tabs.push({slug: 'delegations', label: 'Delegations', group: 'Governance', count: s.nDelegOut.totalCount, body: () => <Delegations {...ctx} />})
    if (s.nDelegHistory.totalCount > 0)
        tabs.push({slug: 'delegations-history', label: 'Delegations history', group: 'Governance', count: s.nDelegHistory.totalCount, body: () => <DelegationHistory {...ctx} dir="out" slug="delegations-history" />})
    if (s.nAccountDays.totalCount > 0) tabs.push({slug: 'charts', label: 'Charts', body: () => <Charts {...ctx} />})

    // dtrack filters Received, so a delegations link carrying one opens there,
    // and multisig opens the signatory side of an account that is no multisig
    const slug = sp.tab === 'delegations' && sp.dtrack != null ? 'received' : sp.tab === 'multisig' && s.multisigById == null ? 'multisig-signatory' : sp.tab
    const active = tabs.find(t => t.slug === slug) ?? tabs[0]
    const groups = [...new Set(tabs.map(t => t.group ?? t.label))]

    return (
        <div>
            <Header a={a} addr={addr} roles={roles} />

            <div className={`mt-4 grid items-start gap-4 ${hasIdentity ? 'lg:grid-cols-2' : ''}`}>
                <div>
                    <DetailCard>
                        <AmountRows>
                            <AmountGroup>
                                <AmountRow label="Balance">
                                    <Balance planck={a.balance} chain={chain} />
                                    <BalanceBar transferable={transferable} locked={locked} />
                                </AmountRow>
                                <AmountRow label="Transferable *" mark="good" share={share(transferable)}>
                                    <Balance planck={transferable} chain={chain} />
                                </AmountRow>
                                <AmountRow label="Locked *" mark="dim" share={share(locked)}>
                                    <Balance planck={locked} chain={chain} />
                                </AmountRow>
                            </AmountGroup>
                            <AmountRow label="Free">
                                <Balance planck={free} chain={chain} />
                            </AmountRow>
                            <AmountRow label="Reserved">
                                <Balance planck={reserved} chain={chain} />
                            </AmountRow>
                            <AmountRow label="Frozen">
                                <Balance planck={frozen} chain={chain} />
                            </AmountRow>
                            <AmountRow label="Votes power **">
                                <Balance planck={power.votesPower} chain={chain} />
                            </AmountRow>
                            <AmountRow label="Max delegations">
                                <Balance planck={power.maxDelegations} chain={chain} />
                            </AmountRow>
                        </AmountRows>
                        <DetailRow label="Nonce">{fmtInt(a.nonce)}</DetailRow>
                        <DetailRow label="First seen">
                            <BlockLink height={a.firstSeenBlock} />
                            <span className="ml-3 text-muted-foreground">
                                <TimeCell iso={a.firstSeenTimestamp} cycle />
                            </span>
                        </DetailRow>
                        {a.lastActiveBlock != null && (
                            <DetailRow label="Last active">
                                <BlockLink height={a.lastActiveBlock} />
                                <span className="ml-3 text-muted-foreground">
                                    <TimeCell iso={lastActiveTime} cycle />
                                </span>
                            </DetailRow>
                        )}
                        {a.evmAddress && (
                            <DetailRow label="EVM origin">
                                <Link href={`/address/${a.evmAddress}`} className="text-primary hover:underline">
                                    {a.evmAddress}
                                </Link>{' '}
                                <span className="ml-1 text-xs text-dim">mapped account of this H160</span>
                            </DetailRow>
                        )}
                    </DetailCard>
                    <div className="mt-2 px-1 text-xs text-dim">* computed from on-chain data, not raw on-chain data</div>
                    <div className="mt-1 px-1 text-xs text-dim">** balance × 6 + max delegated votes on one track</div>
                </div>
                {hasIdentity && <Identity a={a} chain={chain} retired={s.retiredRegistrars} />}
            </div>

            <div className="mt-7">
                <TabBar
                    aria-label="Account"
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
                {active.group && (
                    <div className="mt-4">
                        <TabBar aria-label={active.group} items={tabs.filter(t => t.group === active.group).map(t => ({label: t.label, count: t.count, href: tabHref(addr, t.slug), active: t.slug === active.slug}))} />
                    </div>
                )}
                <div className="mt-4">{active.body()}</div>
            </div>
        </div>
    )
}
