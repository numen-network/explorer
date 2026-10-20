import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import * as echarts from 'echarts'
import {expect, userEvent, waitFor, within} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {fmtSpan, shortHash} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import {
    accountDayRows,
    accountExtrinsics,
    accountPage,
    accountTransferCases,
    accountTransfers,
    counterpartyPage,
    counterpartyRow,
    delegatedFrom,
    delegatedVote,
    delegatedOnTracks,
    delegatingTo,
    delegationAction,
    delegationActionRows,
    delegationActionsOf,
    EVERY_PAYOUT,
    EVERY_REFUND,
    FULL_FIELDS,
    funds,
    HOLDING,
    holdingRows,
    identitySet,
    identityTimeline,
    JJFU_OFFLINE,
    JJFU_RENEWALS,
    judgementsGiven,
    ME,
    MADE_UP_EQUIVOCATION,
    MAX_U128,
    minedBlockRows,
    minedDays,
    MULTISIG_ENDS,
    membership,
    memberships,
    multisigCall,
    multisigOp,
    multisigOps,
    NOT_HELD,
    PRIME_KEY,
    proposals,
    proxyDelegates,
    proxyDelays,
    proxyFor,
    payout,
    payouts,
    poll,
    pureCreatedBy,
    reservedOf,
    SIGNATORIES,
    subject,
    SUBJECT,
    SUBJECT_EVM,
    subRows,
    subUnder,
    timelineVerdicts,
    tokenTransferCases,
    tokenTransferRows,
    tokenTransfersInOneTx,
    TRACKS,
    TREASURY,
    validatorLifecycle,
    validatorOtherSteps,
    validatorRow,
    VERDICTS,
    vote,
    voteAction,
    voteActionRows,
    voteRows,
} from '../../../../../mock/fixtures/accounts.js'
import {batchAll} from '../../../../../mock/fixtures/blocks.js'
import {at, chainInfo, hashOf, HEAD, identity, issuance, numn, PEOPLE, person, rows, transfer} from '../../../../../mock/fixtures.js'
import {all, axesLegible, expectPagersFit, categoriesIn, columnTexts, expectFits, expectNamedNavs, expectWholeWords, filterChips, filterOptions, lastTooltipLines, lonePointsPainted, tabCount, tokenLabels, tooltipsInView, plotLefts} from '../../../../.storybook/fit'
import {AVATAR_HOST, avatars} from '../../../../.storybook/avatar'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import AccountPage from './page'

const wellKnown: Decorator = Story => (
    <WellKnownProvider treasury={ss58Encode(chainInfo.treasuryAccount, chainInfo.ss58)} prime={ss58Encode(PRIME_KEY.id, chainInfo.ss58)} evmChainId={chainInfo.evmChainId}>
        <Story />
    </WellKnownProvider>
)

export default {title: 'Pages/Account', ...pageMeta(AccountPage), decorators: [wellKnown]}

interface Spec {
    account?: {id: string}
    [field: string]: unknown
}

const build = accountPage as (spec: Spec) => Record<string, unknown>

const story = (spec: Spec, searchParams: Record<string, string> = {}) => pageStory(build(spec), {params: {id: spec.account?.id ?? SUBJECT}, searchParams})

const rowValue = (root: HTMLElement, label: string) => {
    const text = within(root).getByText(label, {selector: '[data-slot=amount-label] > span:first-child, div:not([data-slot=amount-label])'})
    return (text.closest('[data-slot=amount-label]') ?? text).nextElementSibling!.textContent
}

// the index stopped at head while the chain ran on to best
const behind = (spec: Spec, head: {height: number; timestamp: string}, best: number, searchParams: Record<string, string> = {}) =>
    pageStory({...build(spec), chainInfos: [{...chainInfo, head: best, finalizedHead: best - 2}], blocks: () => [head]}, {params: {id: spec.account?.id ?? SUBJECT}, searchParams})

const IDENTITY_DEPOSIT = numn(5.41)
const FEE_PAID = numn(2.5)
const AURORA = {judgements: ['Reasonable'], web: 'aurora.example', x: '@aurora_labs', discord: 'auroralabs'}

const named = (traits = {}) => subject({...identity('Aurora Labs', AURORA), ...funds(numn(48_210.75), IDENTITY_DEPOSIT), ...traits})
const mapped = (traits = {}) => subject({evmAddress: SUBJECT_EVM, ...traits})
const lock = (id: string, amount: string) => ({id, amount, reasons: id === 'validatr' ? 'All' : 'Misc'})
const schedule = (locked: number, perBlock: number, startingBlock: number) => ({locked: numn(locked), perBlock: numn(perBlock), startingBlock})

const heading = (root: HTMLElement) => within(root).getByRole('heading', {level: 1}).textContent

export const IdentityNone: StoryObj = {
    ...story({transfers: accountTransfers(5)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Account'),
}

export const IdentityFull: StoryObj = {
    ...story({account: named(identity('Aurora Labs', FULL_FIELDS)), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Aurora Labs'),
}

const PICTURED = {...AURORA, avatar: `${AVATAR_HOST}/aurora.png`}

// the header leads with the avatar and swaps to the identicon on a click
export const IdentityAvatar: StoryObj = {
    ...pageStory(build({account: named(identity('Aurora Labs', PICTURED)), transfers: accountTransfers(3)}), {params: {id: SUBJECT}, msw: [avatars]}),
    play: async ({canvasElement}) => {
        const header = within(canvasElement).getByRole('heading', {level: 1}).parentElement!.parentElement!
        await userEvent.click(await within(header).findByRole('button', {name: 'Show identicon'}))
        expect(within(header).getByRole('button', {name: 'Show avatar'})).toBeInTheDocument()
    },
}

export const IdentityDisplayOnly = story({account: named(identity('Aurora Labs')), transfers: accountTransfers(3)})

export const IdentityUnjudged = story({account: named(identity('Aurora Labs', {judgements: []})), transfers: accountTransfers(3)})

export const IdentityEveryVerdict = story({
    account: named({...identity('Aurora Labs', {judgements: VERDICTS}), ...funds(numn(48_210.75), reservedOf(IDENTITY_DEPOSIT, FEE_PAID))}),
    transfers: accountTransfers(3),
})

export const IdentityWithoutDisplay: StoryObj = {
    ...story({account: named({...identity(null, AURORA), username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect([rowValue(canvasElement, 'Display'), rowValue(canvasElement, 'Username')]).toEqual(['—', 'aurora.numen']),
}

export const UsernameOnly: StoryObj = {
    ...story({account: subject({username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Username')).toBe('aurora.numen')
        expect(heading(canvasElement)).toBe('aurora.numen')
    },
}

export const SubIdentity: StoryObj = {
    ...story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(heading(canvasElement)).toBe('Polaris Guild/payouts'),
}

export const SubFiledUnderAHash: StoryObj = {
    ...story({
        account: subject({...subUnder(PEOPLE[0], 'payouts'), identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe(`Polaris Guild/BlakeTwo256 ${shortHash(hashOf('sub', 1))}`),
}

export const SubWithOwnIdentity = story({account: named({...identity('Aurora Payouts'), ...subUnder(PEOPLE[0], 'payouts')}), transfers: accountTransfers(3)})

// the bar's colours in order, a grey track when there is nothing to split
const barParts = (root: HTMLElement) =>
    [...root.querySelector('[data-slot=balance-bar]')!.children].map(c => ['bg-good', 'bg-dim', 'bg-border'].find(bg => c.classList.contains(bg)))

const shares = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=share]')].map(e => e.textContent)

// every amount ends at the same x, which is what lines the decimal points up
const expectAligned = (root: HTMLElement) => {
    const rights = [...root.querySelectorAll('[data-slot=amount-label] + div > span:first-child')].map(e => Math.round(e.getBoundingClientRect().right))
    expect(rights.length).toBe(8)
    expect(new Set(rights).size).toBe(1)
    const nonce = within(root).getByText('Nonce', {selector: 'div'}).getBoundingClientRect()
    for (const label of root.querySelectorAll('[data-slot=amount-label]')) {
        expect(Math.round(label.getBoundingClientRect().left)).toBe(Math.round(nonce.left))
        expect(label.firstElementChild!.getClientRects()).toHaveLength(1)
    }
}

const expectSplit = (root: HTMLElement, balance: string, transferable: string, locked: string) =>
    expect([rowValue(root, 'Balance'), rowValue(root, 'Transferable *'), rowValue(root, 'Locked *')]).toEqual([balance, transferable, locked].map(v => `${v} NUMN`))

export const BalanceZero: StoryObj = {
    ...story({account: subject({...funds('0'), nonce: 4}), transfers: accountTransfers(4)}),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-border'])
        expect(shares(canvasElement)).toEqual([])
        expectAligned(canvasElement)
    },
}

export const BalanceAllTransferable: StoryObj = {
    ...story({account: subject(funds(numn(1250.5))), transfers: accountTransfers(3)}),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-good'])
        expect(shares(canvasElement)).toEqual(['100.00%', '0.00%'])
    },
}

export const BalanceExtremes: StoryObj = {
    ...story({
        account: subject({
            ...funds(MAX_U128, numn(0.000001), MAX_U128),
            nonce: 2_147_483_647,
            firstSeenBlock: 0,
            firstSeenTimestamp: null,
            lastActiveBlock: HEAD,
            locksJson: [lock('democrac', MAX_U128)],
        }),
        transfers: accountTransferCases(HEAD - 3),
    }),
    play: ({canvasElement}) => {
        expect(barParts(canvasElement)).toEqual(['bg-good', 'bg-dim'])
        expectAligned(canvasElement)
    },
}

export const BalanceReserveOverLocks: StoryObj = {
    ...story({account: subject(funds('98512014386512943379', '5870000000000000000')), transfers: accountTransfers(3)}),
    play: ({canvasElement}) => {
        expectSplit(canvasElement, '104.382014386512943379', '98.512014386512943379', '5.870000000000000000')
        expect(barParts(canvasElement)).toEqual(['bg-good', 'bg-dim'])
        expect(shares(canvasElement)).toEqual(['94.37%', '5.62%'])
        expectAligned(canvasElement)
    },
}

// the transferable slice is a hundred-millionth of the bar and still shows
export const BalanceLocksOverReserve: StoryObj = {
    ...story({
        account: subject({
            ...funds('2122000258102383578190096', numn(2000), numn(2_124_000)),
            locksJson: [lock('vesting', '2068174533895410780646470'), lock('pyconvot', numn(2_124_000))],
        }),
        transfers: accountTransfers(3),
    }),
    play: ({canvasElement}) => {
        expectSplit(canvasElement, '2,124,000.258102383578190096', '0.258102383578190096', '2,124,000.000000000000000000')
        expect(shares(canvasElement)).toEqual(['<0.01%', '99.99%'])
        const sliver = canvasElement.querySelector('[data-slot=balance-bar] > .bg-good')!
        expect(sliver.getBoundingClientRect().width).toBeGreaterThanOrEqual(4)
        expectAligned(canvasElement)
    },
}

// the H160 leaves its note little room on the line, which wraps it between
// whole words
export const EveryRole: StoryObj = {
    ...story({
        account: named({evmAddress: SUBJECT_EVM, ...funds(numn(100_250_000), IDENTITY_DEPOSIT, numn(100_000_000)), locksJson: [lock('validatr', numn(100_000_000))]}),
        prime: true,
        validator: validatorRow(),
        minerDays: minedDays(30),
        registrar: 2,
        deploys: 5,
        tokens: 3,
        curated: 1,
        delegationsIn: delegatedFrom(3),
        multisigOps: [multisigOp(0, {multisig: ME, approvals: SIGNATORIES.slice(1, 3), signatories: SIGNATORIES, threshold: 3})],
        proxiesIn: proxyFor(2),
        transfers: accountTransfers(4),
        payouts: EVERY_PAYOUT,
    }),
    play: async ({canvas}) => expectWholeWords(await canvas.findByText('mapped account of this H160')),
}

// a badge behind a Tip wears the trigger's data-slot, its variant stays its own
const badges = (root: HTMLElement) => [...within(root).getByRole('heading', {level: 1}).parentElement!.querySelectorAll<HTMLElement>('span[data-variant]')]
const roles = (root: HTMLElement) => badges(root).map(b => b.textContent)
const tones = (root: HTMLElement) => Object.fromEntries(badges(root).map(b => [b.textContent, b.dataset.variant]))

// the roles an account earns from the contracts and tokens it deployed
const deployed = (contracts: number, tokens: number, earned: string[]): StoryObj => ({
    ...story({account: mapped(), deploys: contracts, tokens}),
    play: async ({canvasElement}) => expect(roles(canvasElement)).toEqual(earned),
})

export const DeployedNothing = deployed(0, 0, [])

export const DeployedContractsOnly = deployed(3, 0, ['Contract deployer'])

export const DeployedOneToken = deployed(1, 1, ['Token issuer'])

export const DeployedManyTokens = deployed(150, 150, ['Token issuer · 150'])

export const DeployedMoreContractsThanTokens = deployed(160, 150, ['Token issuer · 150', 'Contract deployer'])

// spawned by Polaris Guild, which kept an Any proxy with no delay, beside a Governance proxy that waits 100 blocks
export const PureProxy: StoryObj = {
    ...story({
        pure: pureCreatedBy(PEOPLE[0], HEAD - 9_000),
        proxiesOut: [...proxyDelays(PEOPLE[0], 'Any', [0]), ...proxyDelays(PEOPLE[1], 'Governance', [100])],
        refs: [PEOPLE[0]],
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({'Pure proxy': 'idle', 'Has proxies': 'warn'}),
}

// every proxy waits out a delay, so none can take over at once
export const ProxiesDelayed: StoryObj = {
    ...story({proxiesOut: proxyDelays(PEOPLE[0], 'Any', [100, 14_400]), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({'Has proxies': 'idle'}),
}

const multisigSelf = (threshold: number, signatories: string[]): StoryObj => ({
    ...story({multisigOps: [multisigOp(0, {multisig: ME, approvals: signatories.slice(1, 3), signatories, threshold})], refs: PEOPLE.slice(0, 3), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(tones(canvasElement)).toEqual({[`Multisig ${threshold}/${signatories.length}`]: threshold === 1 || threshold === signatories.length ? 'warn' : 'idle'}),
})

export const MultisigTwoOfThree = multisigSelf(2, PEOPLE.slice(0, 3).map(p => p.id))

export const MultisigOneOfTwo = multisigSelf(1, PEOPLE.slice(0, 2).map(p => p.id))

export const MultisigThreeOfThree = multisigSelf(3, PEOPLE.slice(0, 3).map(p => p.id))

// 1,250.5 at 6x plus the 4,500 votes Root carries, the larger of its two tracks
export const VotesPower: StoryObj = {
    ...story({
        delegationsIn: [...delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 2), numn(1_000)), ...delegatedOnTracks(PEOPLE[2], TRACKS.slice(0, 1), numn(500))],
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Votes power **')).toBe('12,003.000000000000000000 NUMN')
        expect(rowValue(canvasElement, 'Max delegations')).toBe('4,500.000000000000000000 NUMN')
    },
}

export const QrCode: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByRole('button', {name: 'QR code'}))
        const body = within(document.body)
        const code = await body.findByRole('img', {name: `QR code for ${ss58Encode(SUBJECT, chainInfo.ss58)}`})
        await waitFor(() => expect(code).toBeVisible())
        await expect(body.getByRole('button', {name: 'Save PNG'})).toBeVisible()
    },
}

// born at genesis, which the config dates, and never active since
export const Treasury: StoryObj = {
    ...story({
        account: subject({id: TREASURY.id, ...funds(issuance.treasuryPot), nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null, lastActiveBlock: null}),
        transfers: rows(8, (h: number, i: number) => (i % 2 === 0 ? transfer(h, i, {from: TREASURY, extrinsic: null, call: null, amount: numn(5_000 * (i + 1))}) : transfer(h, i, {to: TREASURY}))),
        counts: {transfers: 312},
    }),
    play: async ({canvas, canvasElement}) => {
        expect(rowValue(canvasElement, 'First seen')).toContain('| 2026-09-14 01:00:00 (UTC)')
        expect(canvas.queryByText('Last active')).toBeNull()
    },
}

export const TransfersEmpty: StoryObj = {
    ...story({account: subject({nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null, lastActiveBlock: 0})}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No transfers yet.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Direction')).toEqual(['[All]', 'Out', 'In'])
    },
}

export const TransfersOne = story({transfers: accountTransfers(1)})

const BORN_AT_GENESIS = subject({firstSeenBlock: 0, firstSeenTimestamp: null})
const firstSeen = (root: HTMLElement) => within(root).getByText('First seen').nextElementSibling!.textContent

// an account genesis endowed is dated by the network's genesis time from the config
export const FirstSeenAtGenesis: StoryObj = {
    ...story({account: BORN_AT_GENESIS, transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        expect(firstSeen(canvasElement)).toMatch(/^#0/)
        expect(firstSeen(canvasElement)).toContain('| 2026-09-14 01:00:00 (UTC)')
    },
}

// a network the config has no genesis time for, like the testnet, leaves the empty mark
export const FirstSeenAtGenesisUnconfigured: StoryObj = {
    ...pageStory({...build({account: BORN_AT_GENESIS, transfers: accountTransfers(3)}), chainInfos: [{...chainInfo, evmChainId: 320261}]}, {params: {id: SUBJECT}}),
    play: async ({canvasElement}) => expect(firstSeen(canvasElement)).toBe('#0—'),
}

export const TransfersMany = story({transfers: [...accountTransfers(14), ...accountTransferCases(HEAD - 100)], counts: {transfers: 137}})

export const TransfersOut = story({transfers: accountTransfers(20, 'from'), counts: {transfers: 137, from: 46}}, {tab: 'transfers', dir: 'out'})

export const TransfersIn = story({transfers: accountTransfers(20, 'to'), counts: {transfers: 137, to: 91}}, {tab: 'transfers', dir: 'in'})

export const TransfersFilteredEmpty: StoryObj = {
    ...story({transfers: accountTransfers(3, 'to')}, {tab: 'transfers', dir: 'out'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching transfers.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Direction')).toEqual(['All', '[Out]', 'In'])
    },
}

export const TokensEmpty = story({account: mapped(), transfers: accountTransfers(2)}, {tab: 'tokens'})

export const TokensOne = story({account: mapped(), deploys: 1, tokens: 1, tokenTransfers: tokenTransferRows(1)}, {tab: 'tokens'})

export const TokensMany = story({account: mapped(), deploys: 2, tokenTransfers: [...tokenTransferRows(18), ...tokenTransferCases(HEAD - 200)], counts: {tokenTransfers: 64}}, {tab: 'tokens'})

// one tx moving the account's tokens five times, newest log first like the whole list, 10,000 between 10,001 and 9,999
export const TokensInOneTx: StoryObj = {
    ...story({account: mapped(), tokenTransfers: tokenTransfersInOneTx(HEAD - 9, [10_002, 10_001, 10_000, 9_999, 9_998])}, {tab: 'tokens'}),
    play: async ({canvas}) => {
        const table = canvas.getByRole('columnheader', {name: 'Amount'}).closest('table')!
        await expect(columnTexts(table, 'Amount')).toEqual(['10,002', '10,001', '10,000', '9,999', '9,998'])
    },
}

export const HoldingsOne = story({account: mapped(), holdings: [HOLDING]}, {tab: 'holdings'})

// a token at a zero balance or with no answer to balanceOf is neither listed nor counted
export const HoldingsSkipNotHeld: StoryObj = {
    ...story({account: mapped(), holdings: [HOLDING], notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => {
        expect(tokenLabels(canvasElement)).toEqual(['Wrapped Tumor'])
        expect(tabCount(canvasElement, 'holdings')).toBe('1')
    },
}

// with nothing held there is no tokens tab, and a link to it opens the first tab
export const HoldingsNoneHeld: StoryObj = {
    ...story({account: mapped(), transfers: accountTransfers(2), notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvas, canvasElement}) => {
        expect(tabCount(canvasElement, 'holdings')).toBeNull()
        expectNamedNavs(canvasElement)
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Transfers/)
        expect(within(canvas.getByRole('navigation', {name: 'Transfers'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Native/)
    },
}

export const HoldingsMany: StoryObj = {
    ...story({account: mapped(), holdings: holdingRows(20), counts: {holdings: 33}}, {tab: 'holdings'}),
    play: async ({canvasElement}) =>
        expect(tokenLabels(canvasElement)).toEqual([
            'A token name long enough to crowd its balance off the row',
            'Orbit Credits',
            ...Array.from({length: 16}, (_, i) => `Token ${String(i + 1).padStart(2, '0')}`),
            'Wrapped Tumor',
            '0xe2e2…e2e2',
        ]),
}

export const ExtrinsicsEmpty = story({account: subject({nonce: 0}), transfers: rows(3, (h: number, i: number) => transfer(h, i, {to: ME}))}, {tab: 'extrinsics'})

export const ExtrinsicsOne = story({account: subject({nonce: 1}), extrinsics: accountExtrinsics(1)}, {tab: 'extrinsics'})

export const ExtrinsicsMany = story({account: subject({nonce: 412}), extrinsics: accountExtrinsics(20), counts: {extrinsics: 412}}, {tab: 'extrinsics'})

export const LocksOne = story({account: subject({...funds(numn(1250.5), '0', numn(800)), locksJson: [lock('pyconvot', numn(800))]}), votes: [vote(0, {balance: numn(800)})]}, {tab: 'locks'})

const PARTIAL = schedule(1_000_000, 1, 400_000)

const PAYMENTS = {
    holds: [
        {reason: {__kind: 'Preimage', value: {__kind: 'Preimage'}}, amount: numn(50.25)},
        {reason: {__kind: 'Session', value: {__kind: 'Keys'}}, amount: numn(1)},
    ],
    deposits: [
        {id: 'subs', amount: numn(4.02)},
        {id: 'proxy', amount: numn(3.5)},
        {id: 'announcement', amount: numn(1.25)},
        {id: 'username', amount: numn(7)},
    ],
    gov: [
        {kind: 'Submission', amount: numn(5), referendum: {index: 9, status: 'Ongoing'}},
        {kind: 'Decision', amount: numn(1_000), referendum: {index: 9, status: 'Ongoing'}},
        {kind: 'Submission', amount: numn(5), referendum: {index: 8, status: 'Approved'}},
        {kind: 'Submission', amount: numn(5), referendum: {index: 7, status: 'Rejected'}},
    ],
    bounties: [
        {index: 2, bond: numn(12.4), curatorDeposit: numn(30), proposer: ME, curator: {id: person(4).id}},
        {index: 5, bond: numn(8), curatorDeposit: numn(250), proposer: {id: person(5).id}, curator: ME},
    ],
    children: [{parent: {index: 5}, childIndex: 1, curatorDeposit: numn(25)}],
    pending: [multisigOp(0, MULTISIG_ENDS[0]), multisigOp(1, MULTISIG_ENDS[1])],
}

const RESERVED = reservedOf(
    ...[...PAYMENTS.holds, ...PAYMENTS.deposits].map(x => x.amount),
    IDENTITY_DEPOSIT,
    FEE_PAID,
    FEE_PAID,
    numn(5),
    numn(1_000),
    numn(5),
    numn(5),
    numn(12.4),
    numn(250),
    numn(25),
    numn(20.088),
    numn(20.088),
    numn(3.33)
)

export const LocksEveryKind = story(
    {
        account: named({
            ...identity('Aurora Labs', {judgements: ['Reasonable', 'FeePaid', 'Unknown', 'FeePaid']}),
            ...funds(numn(100_500_000), RESERVED, numn(100_000_000)),
            vestingJson: [PARTIAL],
            locksJson: [lock('vesting', numn(400_000)), lock('validatr', numn(100_000_000)), lock('pyconvot', numn(25_000)), lock('democrac', numn(10))],
            holdsJson: PAYMENTS.holds,
            depositsJson: PAYMENTS.deposits,
        }),
        validator: validatorRow(),
        curated: 1,
        childCurated: 1,
        subs: subRows(2),
        proxiesOut: proxyDelegates(2),
        multisigOps: PAYMENTS.pending,
        govDeposits: PAYMENTS.gov,
        bountyDeposits: PAYMENTS.bounties,
        childBountyDeposits: PAYMENTS.children,
        votes: [vote(0, {balance: numn(25_000)})],
    },
    {tab: 'locks'}
)

const curating = [[2, 9], [2, 10], [2, 11], [10, 1]].map(([index, childIndex]) => ({parent: {index}, childIndex, curatorDeposit: numn(25)}))

// child bounty deposits go by parent then child, #2-10 between #2-9 and #2-11 and parent #10 after #2
export const LocksChildBounties: StoryObj = {
    ...story({account: subject(funds(numn(1250.5), numn(100))), childCurated: curating.length, childBountyDeposits: curating}, {tab: 'locks'}),
    play: async ({canvasElement}) =>
        expect(columnTexts(canvasElement, 'Source')).toEqual(['#2-9', '#2-10', '#2-11', '#10-1'].map(child => `Child bounty ${child} curator deposit`)),
}

export const VestingOne = story({account: subject({...funds(numn(1_001_250.5), '0', numn(400_000)), vestingJson: [PARTIAL], locksJson: [lock('vesting', numn(400_000))]})}, {tab: 'vesting'})

// the lock still holds what vested since the last vest call
export const VestingSchedules: StoryObj = {
    ...story(
        {
            account: subject({
                ...funds(numn(1_171_250.5), '0', numn(700_000)),
                vestingJson: [schedule(120_000, 0.5, HEAD + 10_000), PARTIAL, schedule(50_000, 0.25, 100_000)],
                locksJson: [lock('vesting', numn(700_000))],
            }),
        },
        {tab: 'vesting'}
    ),
    play: async ({canvas}) => {
        await expect(canvas.findByText('520,000 NUMN')).resolves.toBeInTheDocument()
        expect(canvas.getByText('180,000 NUMN')).toBeInTheDocument()
    },
}

// full-precision mainnet amounts keep inside the schedule card at every width
export const VestingFullPrecision: StoryObj = {
    ...story(
        {
            account: subject({
                ...funds('890433818381069939076252', '0', '889683335677682244209740'),
                vestingJson: [{locked: '890383818381069939076252', perBlock: '141169428332868776', startingBlock: 0}],
                locksJson: [lock('vesting', '889683335677682244209740')],
            }),
        },
        {tab: 'vesting'}
    ),
    play: async ({canvas, canvasElement}) => {
        await canvas.findByText('Fully vested at')
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

// indexed to the middle of the schedule while the chain has run past its end
export const VestingIndexBehind: StoryObj = {
    ...behind(
        {account: subject({...funds(numn(1_001_250.5), '0', numn(700_000)), vestingJson: [PARTIAL], locksJson: [lock('vesting', numn(700_000))]})},
        {height: 700_000, timestamp: at(700_000)},
        1_500_000,
        {tab: 'vesting'}
    ),
    play: async ({canvas}) => expect(canvas.getByText('30.00% vested')).toBeInTheDocument(),
}

export const TimelineOne = story({account: named(), timeline: [identitySet(HEAD - 10_000)]}, {tab: 'timeline'})

// the longest event name breaks inside its card
export const TimelineMany: StoryObj = {
    ...story(
        {
            account: named(),
            timeline: [...identityTimeline(), identitySet(HEAD - 12_000), identitySet(HEAD - 14_000), identitySet(HEAD - 16_000)],
            verdicts: timelineVerdicts(),
            counts: {timeline: 41},
        },
        {tab: 'timeline'}
    ),
    play: async ({canvas}) => expectFits(canvas.getByText('DanglingUsernameRemoved')),
}

const withSubs = (n: number) => named({...funds(numn(48_210.75), reservedOf(IDENTITY_DEPOSIT, numn(2.01 * n))), depositsJson: [{id: 'subs', amount: numn(2.01 * n)}]})

export const SubsOne = story({account: withSubs(1), subs: subRows(1)}, {tab: 'subs'})

export const SubsMany = story({account: withSubs(34), subs: subRows(20), counts: {subs: 34}}, {tab: 'subs'})

export const JudgementsEmpty = story({account: named(), registrar: 2}, {tab: 'judgements'})

export const JudgementsOne = story({account: named(), registrar: 2, judged: judgementsGiven(1)}, {tab: 'judgements'})

export const JudgementsMany = story({account: named(), registrar: 2, judged: judgementsGiven(20), counts: {judged: 96}}, {tab: 'judgements'})

const staked = () => subject({...funds(numn(100_012_000), '0', numn(100_000_000)), locksJson: [lock('validatr', numn(100_000_000))]})

const figure = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!.nextElementSibling!.textContent
const offenceCounts = async (root: HTMLElement, offline: string, equivocations: string) => {
    await expect(figure(root, 'Offline (30d)')).toBe(offline)
    await expect(figure(root, 'Equivocations (30d)')).toBe(equivocations)
}

export const ValidatorActive: StoryObj = {
    ...story({account: staked(), validator: validatorRow()}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '0', '0')
        await expect(within(canvasElement).getByText('No offences yet.')).toBeVisible()
        await expect(within(canvasElement).getByRole('navigation', {name: 'pagination'})).toBeVisible()
        await expect(validatorTabs(canvasElement)).toEqual(['validator'])
        await expect(within(within(canvasElement).getByRole('navigation', {name: 'Validator'})).getByRole('link')).toHaveAccessibleName(/^Offences/)
        await expect(tileAboveTabs(canvasElement)).toBe(true)
    },
}

// jJFU missed heartbeats at #292560 and #292620 on mainnet
export const ValidatorOfflineInWindow: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: JJFU_OFFLINE}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '2', '0')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Offline', 'Offline'])
    },
}

// thirty days on, both misses are still listed but no longer counted
export const ValidatorOfflineOutsideWindow: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: JJFU_OFFLINE, counts: {Offline: 0}}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '0', '0')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Offline', 'Offline'])
    },
}

export const ValidatorOfflineAndEquivocation: StoryObj = {
    ...story({account: staked(), validator: validatorRow(), offences: [MADE_UP_EQUIVOCATION, ...JJFU_OFFLINE]}, {tab: 'validator'}),
    play: async ({canvasElement}) => {
        await offenceCounts(canvasElement, '2', '1')
        await expect(columnTexts(canvasElement, 'Kind')).toEqual(['Equivocation', 'Offline', 'Offline'])
    },
}

export const ValidatorInactive = story({validator: validatorRow({active: false, lockedAmount: '0', lockExpiry: null, lastActiveSession: 15_210})}, {tab: 'validator'})

export const ValidatorKicked = story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE}, {tab: 'validator'})

const validatorTabs = (root: HTMLElement) =>
    within(within(root).getByRole('navigation', {name: 'Validator'}))
        .getAllByRole('link')
        .map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'))
// the tile belongs to the whole group, so it sits above the sub-tab strip
const tileAboveTabs = (root: HTMLElement) =>
    Boolean(figureLabel(root, 'Status').compareDocumentPosition(within(root).getByRole('navigation', {name: 'Validator'})) & Node.DOCUMENT_POSITION_FOLLOWING)
const figureLabel = (root: HTMLElement, label: string) => [...root.querySelectorAll('[data-slot=card-description]')].find(d => d.textContent === label)!
const stepTitles = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card] > ol > li')].map(li => li.querySelector('.font-medium')!.textContent)
const stepRow = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'dt'}).nextElementSibling!.textContent

export const ValidatorTimeline: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE, steps: validatorLifecycle()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(validatorTabs(canvasElement)).toEqual(['validator-timeline', 'validator'])
        const sub = within(canvasElement).getByRole('navigation', {name: 'Validator'})
        await expect([tabCount(sub, 'validator-timeline'), tabCount(sub, 'validator')]).toEqual(['5', '2'])
        await expect(tileAboveTabs(canvasElement)).toBe(true)
        await offenceCounts(canvasElement, '2', '0')
        await expect(stepTitles(canvasElement)).toEqual(['Exemption granted', 'Locked', 'Renewed', 'Kicked', 'Exemption revoked'])
        await expect(stepRow(canvasElement, 'Renewals')).toBe('29')
        await expect(stepRow(canvasElement, 'Reason')).toBe('Offline')
        await expect(within(canvasElement).getByRole('navigation', {name: 'pagination'})).toBeVisible()
    },
}

// jJFU locked at genesis without an event, so its renewals are all there is
export const ValidatorTimelineGenesis: StoryObj = {
    ...story({account: staked(), validator: validatorRow({lockExpiry: 1_805_760}), steps: JJFU_RENEWALS}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(stepTitles(canvasElement)).toEqual(['Renewed'])
        await expect(stepRow(canvasElement, 'Renewals')).toBe('29')
        await expect(stepRow(canvasElement, 'Lock expiry')).toBe('1,805,760')
    },
}

export const ValidatorTimelineEveryStep: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false}), steps: validatorOtherSteps()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) =>
        expect(stepTitles(canvasElement)).toEqual(['Locked', 'Dropped', 'Lock released', 'Locked', 'Renewed', 'Equivocation reported', 'Exit requested']),
}

export const ValidatorTimelinePages = story({account: staked(), validator: validatorRow(), steps: validatorLifecycle(), counts: {validatorSteps: 45}}, {tab: 'validator-timeline'})

// an exemption alone leaves no Validator row, so there is no overview to open
export const ValidatorExemptOnly: StoryObj = {
    ...story({steps: validatorLifecycle().slice(0, 1)}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        await expect(validatorTabs(canvasElement)).toEqual(['validator-timeline'])
        await expect(within(canvasElement).queryByText('Offline (30d)')).toBeNull()
        await expect(stepTitles(canvasElement)).toEqual(['Exemption granted'])
    },
}

export const MiningOneBlock = story({minerDays: [{...minedDays(1)[0], blocks: 1}], mined: minedBlockRows(1)}, {tab: 'mining'})

export const MiningOneDay = story({minerDays: minedDays(1), mined: minedBlockRows(12)}, {tab: 'mining'})

export const MiningMany = story({minerDays: minedDays(60), mined: minedBlockRows(20)}, {tab: 'mining'})

export const MiningBeyondChart = story({minerDays: minedDays(60), mined: minedBlockRows(20), counts: {mined: 48_213}}, {tab: 'mining'})

// eleven accounts the subject moved NUMN with, by what it received from them,
// itself among them through a transfer to its own address
const NATIVE_PAIRS = counterpartyPage([
    counterpartyRow(person(0), {amountIn: numn(48_210.5), countIn: 214, amountOut: numn(1_250), countOut: 3, firstBlock: HEAD - 52_000}),
    counterpartyRow(person(1), {amountIn: numn(12_000), countIn: 6}),
    counterpartyRow(ME, {amountIn: numn(5_000), countIn: 1, amountOut: numn(5_000), countOut: 1, firstBlock: HEAD - 300, lastBlock: HEAD - 300}),
    counterpartyRow(person(3), {amountIn: numn(2_400.125), countIn: 9, amountOut: numn(310), countOut: 2}),
    counterpartyRow(person(4), {amountIn: numn(1_000), countIn: 1}),
    counterpartyRow(person(5), {amountIn: numn(18.75), countIn: 2}),
    counterpartyRow(person(6), {amountIn: numn(0.25), countIn: 1}),
    counterpartyRow(person(2), {amountOut: numn(9_999), countOut: 41}),
    counterpartyRow(person(7), {amountOut: numn(640), countOut: 5}),
    counterpartyRow(person(8), {amountOut: numn(12.5), countOut: 1}),
    counterpartyRow(person(9), {amountOut: numn(0.001), countOut: 1}),
])
const counterparties = (spec: Spec, searchParams: Record<string, string> = {}) => story({transfers: accountTransfers(3), ...spec}, {tab: 'counterparties', ...searchParams})
const ring = (root: HTMLElement, title: string) =>
    within(within(root).getByRole('list', {name: title}))
        .getAllByRole('listitem')
        .map(li => [...li.children].slice(1).map(c => c.textContent))
const shareSum = (lines: (string | null)[][]) => lines.reduce((n, l) => n + Math.round(parseFloat(l[2]!) * 100), 0)
// where each sortable heading leads, and whether its arrow marks it the column the list runs down
const counterpartySorts = (root: HTMLElement) =>
    within(root)
        .getAllByRole('columnheader')
        .flatMap(h => [...h.querySelectorAll('a')])
        .map(a => [a.textContent, new URL(a.getAttribute('href')!, 'http://x').searchParams.get('sort'), a.querySelector('.lucide-arrow-down') != null])
const transferTabs = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Transfers'})).getAllByRole('link').map(a => a.firstChild!.lastChild!.textContent)

// no transfer either way leaves the tab out
export const CounterpartiesNone: StoryObj = {
    ...story({}),
    play: async ({canvasElement}) => {
        await within(canvasElement).findByRole('navigation', {name: 'Account'})
        expect(transferTabs(canvasElement)).toEqual(['Native'])
    },
}

// one account sent to the subject and it sent nothing back
export const CounterpartiesOne: StoryObj = {
    ...counterparties({counterparties: counterpartyPage([counterpartyRow(person(1), {amountIn: numn(12_000), countIn: 6})])}),
    play: async ({canvas, canvasElement}) => {
        expect(transferTabs(canvasElement)).toEqual(['Native', 'Counterparties'])
        expect(ring(canvasElement, 'NUMN Transfer-in Accounts')).toEqual([['Orbit Labs', '12K NUMN', '100.00%']])
        expect(canvas.queryByRole('list', {name: 'NUMN Transfer-out Accounts'})).toBeNull()
        expect(canvas.getByText('No transfers yet.')).toBeInTheDocument()
        expect(columnTexts(canvasElement, 'Transfer-out Volume')).toEqual(['0 NUMN'])
    },
}

// past five a side the smallest pool into Others, and the shares still add up to the whole
export const CounterpartiesMany: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS, counts: {pairs: 46}}),
    play: async ({canvasElement}) => {
        const inside = ring(canvasElement, 'NUMN Transfer-in Accounts')
        expect(inside.map(l => l[0])).toEqual(['Polaris Guild', 'Orbit Labs', 'self', 'Redshift', 'Others (3)'])
        expect(inside[4][1]).toBe('1,019 NUMN')
        expect(shareSum(inside)).toBe(10_000)
        const outside = ring(canvasElement, 'NUMN Transfer-out Accounts')
        expect(outside).toHaveLength(5)
        expect(shareSum(outside)).toBe(10_000)
        expect(columnTexts(canvasElement, '#')).toEqual(Array.from({length: 11}, (_, i) => String(i + 1)))
        expect(columnTexts(canvasElement, 'Account')[2]).toBe('self')
        expect(columnTexts(canvasElement, 'First')[2]).toBe(`#${(HEAD - 300).toLocaleString('en-US')}`)
        expect(counterpartySorts(canvasElement)).toEqual([
            ['Transfer-in Volume', null, true],
            ['Transfer-in Count', 'in-count', false],
            ['Transfer-out Volume', 'out-volume', false],
            ['Transfer-out Count', 'out-count', false],
        ])
        expectPagersFit(canvasElement)
    },
}

// five a side all get a slice of their own
export const CounterpartiesFive: StoryObj = {
    ...counterparties({counterparties: counterpartyPage(NATIVE_PAIRS.rows.slice(0, 5))}),
    play: async ({canvasElement}) => {
        const inside = ring(canvasElement, 'NUMN Transfer-in Accounts')
        expect(inside.map(l => l[0])).toEqual(['Polaris Guild', 'Orbit Labs', 'self', 'Redshift', 'Spamlord'])
        expect(shareSum(inside)).toBe(10_000)
    },
}

// a second page counts on from where the first left off
export const CounterpartiesSecondPage: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS, counts: {pairs: 46}}, {page: '2', size: '20'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, '#')[0]).toBe('21'),
}

export const CounterpartiesByOutCount: StoryObj = {
    ...counterparties({counterparties: NATIVE_PAIRS}, {sort: 'out-count'}),
    play: async ({canvasElement}) =>
        expect(counterpartySorts(canvasElement).map(h => [h[0], h[2]])).toEqual([
            ['Transfer-in Volume', false],
            ['Transfer-in Count', false],
            ['Transfer-out Volume', false],
            ['Transfer-out Count', true],
        ]),
}

const WTMR_ID = HOLDING.token.id
const ZERO = '0x0000000000000000000000000000000000000000'
const TOKEN_PAIRS = counterpartyPage([
    counterpartyRow(ZERO, {amountIn: numn(255_016.4), countIn: 12, amountOut: numn(2), countOut: 2}),
    counterpartyRow('0xacc96782e7336a38d066687f2bb6247fe854adad', {amountOut: numn(1), countOut: 1}),
])

// a contract token's counterparties are EVM addresses, the mint and burn side included
export const CounterpartiesToken: StoryObj = {
    ...counterparties({account: mapped(), holdings: holdingRows(4), counterparties: TOKEN_PAIRS}, {token: WTMR_ID}),
    play: async ({canvasElement}) => {
        // listed in the order the holder rows come back in, each contract by its address too, which a nameless one already shows
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['NUMN', 'LONGNAME 0xe3e3…e3e3', 'ORB 0xe1e1…e1e1', '[WTMR 0xa179…a2e9]', '0xe2e2…e2e2'])
        // the native token wears the chain logo, a listed token its own, the rest an empty square
        const trigger = within(canvasElement).getByRole('combobox', {name: 'Token'})
        expect(trigger).toHaveTextContent(/^WTMR0xa179…a2e9$/)
        expect(trigger.querySelector('img')).not.toBeNull()
        await userEvent.click(trigger)
        const list = await within(document.body).findByRole('listbox')
        expect(within(list).getAllByRole('option').map(o => o.querySelector('img') != null)).toEqual([true, false, false, true, false])
        await userEvent.keyboard('{Escape}')
        expect(ring(canvasElement, 'WTMR Transfer-in Accounts')).toEqual([['0x0000…0000', '≈255.01K WTMR', '100.00%']])
        expect(columnTexts(canvasElement, 'Account')).toEqual(['0x0000…0000', '0xacc9…adad'])
        expect(columnTexts(canvasElement, 'Transfer-in Volume')).toEqual(['≈255.01K WTMR', '0 WTMR'])
    },
}

// an account that never moved NUMN opens on its first token, and NUMN is no pick
export const CounterpartiesTokenOnly: StoryObj = {
    ...counterparties({account: mapped(), transfers: [], tokenTransfers: tokenTransferRows(2), holdings: [HOLDING], counterparties: TOKEN_PAIRS}),
    play: async ({canvasElement}) => {
        expect(await filterOptions(canvasElement, 'Token')).toEqual(['[WTMR 0xa179…a2e9]'])
        expect(within(canvasElement).getByRole('combobox', {name: 'Token'})).toHaveTextContent(/^WTMR0xa179…a2e9$/)
        expect(within(canvasElement).getByRole('list', {name: 'WTMR Transfer-in Accounts'})).toBeInTheDocument()
    },
}

const DAYS = accountDayRows(30)
const charted = (spec = {}, searchParams: Record<string, string> = {}) => story({accountDays: DAYS, ...spec}, {tab: 'charts', ...searchParams})
const chartSeries = (root: HTMLElement) => {
    const chart = [...root.querySelectorAll<HTMLElement>('[_echarts_instance_]')].map(el => echarts.getInstanceByDom(el)!)[0]
    return chart.getOption() as {series: {name: string; data: number[]}[]; legend: {selected: Record<string, boolean>}[]; yAxis: unknown[]}
}
// the note under a chart starts where its plot does
const noteAligned = async (root: HTMLElement, note: string) => {
    const text = within(root).getByText(note)
    expect(text.closest('[data-slot=card]')).not.toBeNull()
    const chart = root.querySelector<HTMLElement>('[_echarts_instance_]')!
    await waitFor(() => expect(text.getBoundingClientRect().left + parseFloat(getComputedStyle(text).paddingLeft) - chart.getBoundingClientRect().left).toBeCloseTo(plotLefts(root)[0], 0))
}
const chartViews = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Chart'})).getAllByRole('link')

export const ChartsNone: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => {
        await within(canvasElement).findByRole('navigation', {name: 'Account'})
        expect(within(within(canvasElement).getByRole('navigation', {name: 'Account'})).queryByRole('link', {name: /Charts/})).toBeNull()
    },
}

export const ChartsBalance: StoryObj = {
    ...charted(),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        expect(chartViews(canvasElement).map(l => [l.textContent, l.dataset.active])).toEqual([
            ['Balance', 'true'],
            ['Activity', 'false'],
            ['Fees', 'false'],
        ])
        // the quiet days between the rows are filled in, up to the head day
        const [days] = categoriesIn(canvasElement)
        expect(days).toHaveLength(30)
        expect(days[0]).toBe(DAYS[0].day)
        expect(days.at(-1)).toBe(DAYS.at(-1)!.day)
        const {series, legend, yAxis} = chartSeries(canvasElement)
        expect(series.map(s => s.name)).toEqual(['Balance', 'Free', 'Reserved', 'Frozen'])
        expect(legend[0].selected).toEqual({Balance: true, Free: false, Reserved: false, Frozen: false})
        await noteAligned(canvasElement, 'at the last block of each UTC day')
        expect(yAxis).toHaveLength(1)
        // a quiet day holds the close before it
        const quiet = days.findIndex(d => !DAYS.some(r => r.day === d))
        expect(series[0].data[quiet]).toBe(series[0].data[quiet - 1])
        expect(lastTooltipLines(canvasElement)[0][0]).toBe(`${DAYS.at(-1)!.day} (UTC)`)
    }),
}

// a view the strip does not offer opens the default one
export const ChartsUnknownView: StoryObj = {
    ...charted({}, {chart: 'flow'}),
    play: async ({canvasElement}) => {
        await waitFor(() => expect(chartViews(canvasElement).find(l => l.dataset.active === 'true')?.textContent).toBe('Balance'))
    },
}

export const ChartsActivity: StoryObj = {
    ...charted({}, {chart: 'activity'}),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        const {series} = chartSeries(canvasElement)
        expect(series.map(s => s.name)).toEqual(['Extrinsics', 'Transfer-in', 'Transfer-out'])
        const [days] = categoriesIn(canvasElement)
        const quiet = days.findIndex(d => !DAYS.some(r => r.day === d))
        expect(series.map(s => s.data[quiet])).toEqual([0, 0, 0])
        await noteAligned(canvasElement, 'summed over each UTC day')
        expect(within(canvasElement).queryByText(/at the last block/)).toBeNull()
    }),
}

export const ChartsFees: StoryObj = {
    ...charted({}, {chart: 'fees'}),
    play: all(axesLegible, tooltipsInView, async ({canvasElement}) => {
        expect(chartSeries(canvasElement).series.map(s => s.name)).toEqual(['To treasury', 'To miner', 'Tip'])
        const [lines] = lastTooltipLines(canvasElement)
        expect(lines.slice(0, 2)).toEqual([`${DAYS.at(-1)!.day} (UTC)`, 'Fees: 0.55 NUMN'])
        await noteAligned(canvasElement, 'summed over each UTC day')
        expect(within(canvasElement).queryByText(/at the last block/)).toBeNull()
    }),
}

// a single day the account was ever touched draws as a dot
export const ChartsOneDay: StoryObj = {...charted({accountDays: DAYS.slice(-1)}), play: lonePointsPainted}

// nothing happened in the window, so the close before it runs flat across all of it
export const ChartsQuietWindow: StoryObj = {
    ...charted({accountDays: [], priorDay: {...DAYS[0], day: '2020-01-01'}}, {r: '30'}),
    play: async ({canvasElement}) => {
        await waitFor(() => expect(categoriesIn(canvasElement)).toHaveLength(1))
        const [days] = categoriesIn(canvasElement)
        expect(days).toHaveLength(31)
        expect(new Set(chartSeries(canvasElement).series[0].data).size).toBe(1)
    },
}

export const ChartsEmptyRange: StoryObj = {
    ...charted({accountDays: [], counts: {accountDays: 30}}, {after: '2020-01-01', before: '2020-01-31'}),
    play: async ({canvasElement}) => {
        await within(canvasElement).findByText('No data in this range.')
    },
}

const voting = (amount: string) => subject({...funds(numn(1250.5), '0', amount), locksJson: [lock('pyconvot', amount)]})

const governanceTabs = (root: HTMLElement) =>
    Object.fromEntries(
        within(within(root).getByRole('navigation', {name: 'Governance'}))
            .getAllByRole('link')
            .map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!, a.getAttribute('aria-current') === 'page'])
    )

// each summary tile above a list, its figures by label
const summaries = (root: HTMLElement) =>
    [...root.querySelectorAll('[data-slot=card-header]')]
        .filter(h => h.querySelector('[data-slot=card-description]'))
        .map(h => Object.fromEntries([...h.querySelectorAll('[data-slot=card-description]')].map(d => [d.textContent, d.nextElementSibling!.textContent])))

// nobody delegates to this account, so there is no Received tab
export const DelegationsOut: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('Delegating to')).toBeInTheDocument()
        expect(governanceTabs(canvasElement)).toEqual({delegations: true})
    },
}

// three tracks at 1,000, 2,000.25 and 3,000.5, the largest is what the account put up
export const DelegationsOutSummary: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{Tracks: '3', Delegated: '3,000.5 NUMN'}]),
}

// Delegating to rows go by track id, two-digit ids after the single digits, and the incoming side waits on its own tab
export const DelegationsBoth: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Track')).toEqual(['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender'])
        await expect(canvas.queryByText('Delegated from')).toBeNull()
        expect(governanceTabs(canvasElement)).toEqual({delegations: true, received: false})
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        expect([tabCount(nav, 'delegations'), tabCount(nav, 'received')]).toEqual(['7', '5'])
        expect(summaries(canvasElement)).toHaveLength(1)
    },
}

const tracksTable = (root: HTMLElement) => within(root).getByRole('columnheader', {name: 'Delegators'}).closest('table')!
const rootAndUpgrade = [...delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 2), numn(1_000)), ...delegatedOnTracks(PEOPLE[2], TRACKS.slice(0, 1), numn(500))]

// two delegators over two tracks, Root carrying 1,500 at 3x for the most on one track
export const ReceivedSummary: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) =>
        expect(summaries(canvasElement)).toEqual([{Tracks: '2', Delegators: '2', Capital: '1,500 NUMN', 'Max delegations': '4,500 NUMN'}]),
}

// one delegator on one track, 5,000 at 3x
export const ReceivedTracksOne: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(PEOPLE[1], TRACKS.slice(0, 1), numn(5_000))}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([['1'], ['5,000 NUMN'], ['15,000 NUMN']])
    },
}

// Root carries both delegators, Runtime Upgrade one, every row linking to its own filter
export const ReceivedTracksMany: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const table = tracksTable(canvasElement)
        expect(columnTexts(table, 'Track')).toEqual(['Root', 'Runtime Upgrade'])
        expect([columnTexts(table, 'Delegators'), columnTexts(table, 'Capital'), columnTexts(table, 'Votes')]).toEqual([
            ['2', '1'],
            ['1,500 NUMN', '1,000 NUMN'],
            ['4,500 NUMN', '3,000 NUMN'],
        ])
        const links = within(table).getAllByRole('link')
        const params = links.map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams)
        expect(params.map(q => [q.get('rtab'), q.get('dtrack')])).toEqual([
            ['delegators', TRACKS[0].id],
            ['delegators', TRACKS[1].id],
        ])
    },
}

// Received opens on its tracks, the delegator list a tab away
export const ReceivedOpensOnTracks: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received'}),
    play: async ({canvasElement}) => {
        const links = within(within(canvasElement).getByRole('navigation', {name: 'Received'})).getAllByRole('link')
        expect(links.map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('rtab'), a.querySelector('[data-slot=badge]')!.textContent, a.getAttribute('aria-current')])).toEqual([
            ['tracks', '2', 'page'],
            ['delegators', '3', null],
        ])
        expect(within(canvasElement).queryByRole('columnheader', {name: 'Delegated from'})).toBeNull()
    },
}

// the delegator list keeps the summary and leaves the tracks table behind
export const ReceivedDelegators: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) => {
        const links = within(within(canvasElement).getByRole('navigation', {name: 'Received'})).getAllByRole('link')
        expect(links.map(a => a.getAttribute('aria-current'))).toEqual([null, 'page'])
        expect(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'})).toBeInTheDocument()
        expect(within(canvasElement).queryByRole('columnheader', {name: 'Delegators'})).toBeNull()
        expect(summaries(canvasElement)).toHaveLength(1)
    },
}

interface WhoClause {
    id_eq?: string
    OR?: {identityDisplay_containsInsensitive?: string}[]
}

// the delegator list answering the who clause a search sends, an address by id and any other text by display name
const searched = (q: string) =>
    pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({where}: {where: {who?: WhoClause}}) =>
                rootAndUpgrade.filter(d => {
                    const who = where.who
                    if (who == null) return true
                    if (who.id_eq != null) return d.who.id === who.id_eq
                    return (d.who.identityDisplay ?? '').toLowerCase().includes(who.OR![0].identityDisplay_containsInsensitive!.toLowerCase())
                }),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', q}}
    )

const delegatorsShown = (root: HTMLElement) => columnTexts(within(root).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Delegated from')

// a whole address finds the one delegator, its single Root delegation
export const ReceivedSearchAddress: StoryObj = {
    ...searched(ss58Encode(PEOPLE[2].id, chainInfo.ss58)),
    play: async ({canvasElement}) => {
        expect(within(canvasElement).getByPlaceholderText('Search address or identity')).toHaveValue(ss58Encode(PEOPLE[2].id, chainInfo.ss58))
        expect(delegatorsShown(canvasElement)).toHaveLength(1)
        expect(columnTexts(canvasElement, 'Capital')).toEqual(['500 NUMN'])
    },
}

// any other text matches identity names, Orbit Labs on both its tracks
export const ReceivedSearchName: StoryObj = {
    ...searched('orbit'),
    play: async ({canvasElement}) => expect(delegatorsShown(canvasElement)).toEqual(['Orbit Labs', 'Orbit Labs']),
}

// a search nobody answers says so rather than showing an empty table
export const ReceivedSearchNoMatch: StoryObj = {
    ...searched('nobody'),
    play: async ({canvas}) => expect(canvas.getByText('No matching delegations.')).toBeInTheDocument(),
}

// where each sortable heading of the delegator list leads, and which one shows an arrow pointing a way
const sortHeads = (root: HTMLElement) => {
    const head = within(root).getByRole('columnheader', {name: 'Delegated from'}).closest('tr')!
    return Object.fromEntries(
        within(head)
            .getAllByRole('link')
            .map(a => {
                const q = new URL(a.getAttribute('href')!, 'http://x').searchParams
                return [a.textContent, [q.get('sort'), q.get('order'), a.querySelector('.lucide-arrow-down') ? 'down' : a.querySelector('.lucide-arrow-up') ? 'up' : null]]
            })
    )
}

// capital biggest first is the default, the url carries no order and its heading turns it around
export const ReceivedSortDefault: StoryObj = {
    ...story({delegationsIn: rootAndUpgrade}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) =>
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'desc', null],
            Capital: ['capital', 'asc', 'down'],
            Votes: ['votes', 'desc', null],
            Since: ['since', 'desc', null],
        }),
}

// votes smallest first reaches the query as votes_ASC, its heading turns it back and capital goes home to the default
export const ReceivedSortVotesAscending: StoryObj = {
    ...pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({orderBy}: {orderBy: string[]}) => (orderBy?.[0] === 'votes_ASC' ? [...rootAndUpgrade].reverse() : rootAndUpgrade),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', sort: 'votes', order: 'asc'}}
    ),
    play: async ({canvasElement}) => {
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'desc', null],
            Capital: [null, null, null],
            Votes: ['votes', 'desc', 'up'],
            Since: ['since', 'desc', null],
        })
        expect(columnTexts(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Capital')).toEqual(['500 NUMN', '1,000 NUMN', '1,000 NUMN'])
    },
}

// conviction strongest first reaches the query as the numeric level, so None sits below Locked1x
export const ReceivedSortConviction: StoryObj = {
    ...pageStory(
        {
            ...build({delegationsIn: rootAndUpgrade}),
            delegations: ({orderBy}: {orderBy: string[]}) => (orderBy?.[0] === 'convictionLevel_DESC' ? [...rootAndUpgrade].reverse() : rootAndUpgrade),
        },
        {params: {id: SUBJECT}, searchParams: {tab: 'received', rtab: 'delegators', sort: 'conviction'}}
    ),
    play: async ({canvasElement}) => {
        expect(sortHeads(canvasElement)).toEqual({
            Conviction: ['conviction', 'asc', 'down'],
            Capital: [null, null, null],
            Votes: ['votes', 'desc', null],
            Since: ['since', 'desc', null],
        })
        expect(columnTexts(within(canvasElement).getByRole('columnheader', {name: 'Delegated from'}).closest('table')!, 'Capital')).toEqual(['500 NUMN', '1,000 NUMN', '1,000 NUMN'])
    },
}

const SPENDERS = TRACKS.filter(t => t.name.endsWith('_spender'))

export const Received = story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'received', rtab: 'delegators'})

export const ReceivedTrackFilter = story({delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'received', dtrack: '30'})

// a delegations link carrying a Track filter opens Received on that track
export const ReceivedFromDelegationsLink: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'delegations', dtrack: '30'}),
    play: async ({canvas, canvasElement}) => {
        expect(governanceTabs(canvasElement)).toEqual({delegations: false, received: true})
        await expect(canvas.getByText('Delegated from')).toBeInTheDocument()
        expect(within(canvas.getByRole('navigation', {name: 'Received'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Delegators/)
    },
}

// a link to a track nobody delegates on any more picks that track at 0
export const ReceivedTrackFilterEmpty: StoryObj = {
    ...story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'received', dtrack: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching delegations.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['All 45', '[Root 0]', 'Runtime Upgrade 0', 'Wish For Change 0', 'Identity Admin 0', 'Referendum Canceller 0', 'Referendum Killer 0', 'Small Spender 18', 'Medium Spender 15', 'Big Spender 12'])
    },
}

// Track options go by track id, two-digit ids after the single digits
export const ReceivedTrackOptions: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) =>
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All 5]', 'Root 1', 'Runtime Upgrade 1', 'Wish For Change 1', 'Identity Admin 1', 'Referendum Canceller 1', 'Referendum Killer 0', 'Small Spender 0', 'Medium Spender 0', 'Big Spender 0']),
}

const EVERY_TRACK = ['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']

// one account delegating the same balance on every track, its tracks in track order with two-digit ids after the single digits
export const ReceivedEveryTrack: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'received'}),
    play: async ({canvasElement}) => expect(columnTexts(tracksTable(canvasElement), 'Track')).toEqual(EVERY_TRACK),
}

// the same delegations listed one row per track, in the same order
export const ReceivedEveryTrackDelegators: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Track')).toEqual(EVERY_TRACK),
}

const proxied = (n: number) => subject({...funds(numn(1250.5), numn(1.75 * n)), depositsJson: [{id: 'proxy', amount: numn(1.75 * n)}]})

export const ProxiesOut = story({account: proxied(1), proxiesOut: proxyDelegates(1)}, {tab: 'proxies'})

export const ProxiesIn = story({proxiesIn: proxyFor(2)}, {tab: 'proxies'})

// the same account as an Any proxy twice, told apart by the delay alone
export const ProxiesSameDelegateTwoDelays: StoryObj = {
    ...story({account: proxied(2), proxiesOut: proxyDelays(person(1), 'Any', [0, 14_400])}, {tab: 'proxies'}),
    play: async ({canvasElement}) => {
        await expect(columnTexts(canvasElement, 'Delegates to')).toEqual(['Orbit Labs', 'Orbit Labs'])
        await expect(columnTexts(canvasElement, 'Type')).toEqual(['Any', 'Any'])
        await expect(columnTexts(canvasElement, 'Delay')).toEqual(['—', `14,400 blocks ≈ ${fmtSpan(14_400 * chainInfo.blockTime)}`])
    },
}

export const ProxiesBoth = story({account: proxied(9), proxiesOut: proxyDelegates(9), proxiesIn: proxyFor(3)}, {tab: 'proxies'})

export const ProxiesInMany = story({proxiesIn: proxyFor(45)}, {tab: 'proxies'})

export const ProxiesInPage2 = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: '2'})

export const ProxiesInLastPage = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: lastPage(45)})

// each link of a tab strip as its tab or mtab, its count and whether it is open
const strip = (root: HTMLElement, name: string, param: string) =>
    within(within(root).getByRole('navigation', {name}))
        .getAllByRole('link')
        .map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get(param), a.querySelector('[data-slot=badge]')!.textContent, a.getAttribute('aria-current')])

// the subject as the multisig, each operation approved by a run of its signatories
const addressOp = (i: number) => {
    const end = MULTISIG_ENDS[i % MULTISIG_ENDS.length]
    return multisigOp(i, {threshold: 3, ...end, approvals: SIGNATORIES.slice(i % 3, (i % 3) + (end.approvals?.length ?? 2)), multisig: ME, signatories: SIGNATORIES})
}

const asAddress = (count: number) => Array.from({length: count}, (_, i) => addressOp(i))

// a multisig link opens the signatory side of an account that is no multisig
export const MultisigSignatoryOnly: StoryObj = {
    ...story({multisigOps: [multisigOp(0)], memberships: [membership(0)]}, {tab: 'multisig'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([['multisig-signatory', '1', 'page']])
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab')).toEqual([
            ['operations', '1', 'page'],
            ['memberships', '1', null],
        ])
    },
}

export const MultisigMember = story(
    {account: subject({...funds(numn(1250.5), reservedOf(numn(20.088), numn(20.088)))}), multisigOps: multisigOps(), memberships: memberships(3)},
    {tab: 'multisig-signatory'}
)

export const MultisigMemberships: StoryObj = {
    ...story({multisigOps: multisigOps(), memberships: memberships(3)}, {tab: 'multisig-signatory', mtab: 'memberships'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab').map(l => l[2])).toEqual([null, 'page'])
        expect(within(canvasElement).getByRole('columnheader', {name: 'Pending'})).toBeInTheDocument()
    },
}

const manyMemberships = memberships(45)

export const MultisigMembershipsPage2 = story({multisigOps: multisigOps(), memberships: manyMemberships}, {tab: 'multisig-signatory', mtab: 'memberships', page: '2'})

export const MultisigAccount: StoryObj = {
    ...story({multisigOps: asAddress(MULTISIG_ENDS.length)}, {tab: 'multisig'}),
    play: async ({canvasElement}) => expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([['multisig', String(MULTISIG_ENDS.length), 'page']]),
}

const ran = multisigCall(ME, batchAll)

// an expanded operation loads its call tree and its signatories with the page
export const MultisigOperationCall: StoryObj = {
    ...story({multisigOps: [{...addressOp(2), call: ran.call}], multisigCalls: ran.calls, refs: PEOPLE}, {tab: 'multisig'}),
    play: async ({canvasElement}) => {
        const canvas = within(canvasElement)
        await userEvent.click(await canvas.findByRole('button', {name: 'expand'}))
        expect(canvas.getByRole('heading', {name: 'Approvals'})).toBeVisible()
        expect(canvas.getAllByText('Utility.batch_all')).toHaveLength(2)
        expect(canvas.getAllByText('Balances.transfer_keep_alive')).toHaveLength(ran.calls.length - 1)
    },
}

// each signatory's approvals and openings over the six operations, the tile above them
export const MultisigSignatories: StoryObj = {
    ...story({multisigOps: asAddress(MULTISIG_ENDS.length), refs: PEOPLE}, {tab: 'multisig', mtab: 'signatories'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'As a multisig address', 'mtab')).toEqual([
            ['operations', String(MULTISIG_ENDS.length), null],
            ['signatories', String(SIGNATORIES.length), 'page'],
        ])
        expect(summaries(canvasElement)).toEqual([{Threshold: `3 of ${SIGNATORIES.length}`, Pending: '3', Operations: String(MULTISIG_ENDS.length)}])
        const cells = (i: number) => [...canvasElement.querySelectorAll('tbody tr')].map(tr => tr.children[i].textContent)
        expect(cells(1)).toEqual(['2', '3', '3', '1', '0'])
        expect(cells(2)).toEqual(['2', '2', '2', '0', '0'])
    },
}

// a multisig that signs for another multisig stands on both sides
export const MultisigBothSides: StoryObj = {
    ...story({multisigOps: [...asAddress(2), multisigOp(10)], memberships: [membership(0)]}, {tab: 'multisig'}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([
            ['multisig', '2', 'page'],
            ['multisig-signatory', '1', null],
        ]),
}

const manyOps = asAddress(45)

export const MultisigMany = story({multisigOps: manyOps}, {tab: 'multisig'})

export const MultisigPage2 = story({multisigOps: manyOps}, {tab: 'multisig', page: '2'})

export const MultisigLastPage = story({multisigOps: manyOps}, {tab: 'multisig', page: lastPage(manyOps.length)})

export const ProposedOne: StoryObj = {
    ...story({account: voting(numn(1_000)), proposed: proposals(1)}, {tab: 'proposed'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'proposed')).toBe('1')
        expect(columnTexts(canvasElement, 'Referendum')).toEqual(['#1 · Referendum 1 title'])
    },
}

const manyProposed = proposals(25)

export const ProposedMany = story({account: voting(numn(1_000)), proposed: manyProposed}, {tab: 'proposed'})

export const ProposedLastPage = story({account: voting(numn(1_000)), proposed: manyProposed}, {tab: 'proposed', page: lastPage(manyProposed.length)})

// totals by source, a chip per source, and the beneficiary role in the header
export const TreasuryEverySource: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'treasury')).toBe('7')
        expect(summaries(canvasElement)).toEqual([{'Total received': '≈28.6K NUMN', Spends: '22K NUMN', Bounties: '5,700 NUMN', 'Child bounties': '500 NUMN', 'Curator fees': '405 NUMN'}])
        expect(filterChips(canvasElement, 'Source')).toEqual(['[All 7]', 'Spends 2', 'Bounties 3', 'Child bounties 2'])
        expect(roles(canvasElement)).toContain('Treasury beneficiary')
    },
}

export const TreasuryBounties: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: EVERY_PAYOUT}, {tab: 'treasury', source: 'Bounty'}),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Source')).toEqual(['All 7', 'Spends 2', '[Bounties 3]', 'Child bounties 2'])
        expect(columnTexts(canvasElement, 'Source')).toEqual(['Bounty #3 · Wallet audit', 'Bounty #3 · Wallet audit', 'Bounty #2'])
    },
}

// curator fees alone earn the tab but not the beneficiary role
export const TreasuryCuratorOnly: StoryObj = {
    ...story({account: voting(numn(1_000)), payouts: [payout(0, 'Bounty', 'Curator', 380, {bounty: {index: 3, description: 'Wallet audit', referendum: null}})]}, {tab: 'treasury'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'treasury')).toBe('1')
        expect(roles(canvasElement)).not.toContain('Treasury beneficiary')
    },
}

const manyPayouts = payouts(25)

export const TreasuryMany = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury'})

export const TreasuryLastPage = story({account: voting(numn(1_000)), payouts: manyPayouts}, {tab: 'treasury', page: lastPage(manyPayouts.length)})

export const VotesOne = story({account: voting(numn(1_000)), votes: [vote(0)]}, {tab: 'votes'})

const manyVotes = [...voteRows(), ...Array.from({length: 35}, (_, i) => vote(i + 10, {referendum: poll(47 - i, 'Ongoing', null)}))]

export const VotesMany = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes'})

export const VotesPage2 = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: '2'})

export const VotesLastPage = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: lastPage(manyVotes.length)})

// votes cast in one block list the newest referendum first, #10 between #11 and #9
export const VotesInOneBlock: StoryObj = {
    ...story({account: voting(numn(3_000)), votes: [11, 10, 9].map((index, i) => vote(i, {block: HEAD - 500, referendum: poll(index, 'Ongoing', null)}))}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Referendum').map(t => t!.split(' · ')[0])).toEqual(['#11', '#10', '#9']),
}

// nine standing votes over 14 referenda open since the account showed up, #6 and #9 still deciding and the removed #8 left out, the rate's tip saying which referenda it counts
export const VotesSummary: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), counts: {referenda: 14}}, {tab: 'votes'}),
    play: async ({canvas, canvasElement}) => {
        expect(summaries(canvasElement)).toEqual([{'All votes': '9', Active: '2', 'Participation rate': '64.28%', 'Total locked': '250K NUMN'}])
        await expect(canvas.getByLabelText('Counts only referenda still open after the account first appeared')).toBeInTheDocument()
    },
}

// the delegated votes a referendum counts reach the account's standard vote
// there, and its panel names who delegated
export const VotesDelegated: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), delegatedVotes: [delegatedVote(6, 'Locked3x', 1_500, PEOPLE[1])], refs: [PEOPLE[1]]}, {tab: 'votes'}),
    play: async ({canvasElement, userEvent}) => {
        expect(columnTexts(canvasElement, 'Votes')[0]).toBe('5,500 NUMN1,000 + 4,500 delegated')
        const row = within(canvasElement).getByRole('link', {name: /^#6\b/}).closest('tr')!
        await userEvent.click(within(row).getByRole('button', {name: 'expand'}))
        const list = within(canvasElement).getByText('Delegation list').parentElement!
        expect(columnTexts(list, 'Delegator')).toEqual(['Orbit Labs'])
    },
}

// the type chips count every vote the account cast, removed ones too
export const VotesTypes: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows()}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(filterChips(canvasElement, 'Type')).toEqual(['[All 10]', 'Aye 4', 'Nay 4', 'Split 1', 'Abstain 1']),
}

// picking Split asks for split votes only and keeps every chip's count
export const VotesTypeSplit: StoryObj = {
    ...pageStory(
        {...build({account: voting(numn(250_000)), votes: voteRows()}), votes: ({where}: {where: {kind_eq?: string}}) => voteRows().filter(v => v.kind === where.kind_eq)},
        {params: {id: SUBJECT}, searchParams: {tab: 'votes', type: 'split'}}
    ),
    play: async ({canvasElement}) => {
        expect(filterChips(canvasElement, 'Type')).toEqual(['All 10', 'Aye 4', 'Nay 4', '[Split 1]', 'Abstain 1'])
        expect(columnTexts(canvasElement, 'Vote')).toEqual(['AyeNay'])
    },
}

// the record lists every referendum up to the highest voted on, its legend naming each kind of square
export const VotesRecord: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows()}, {tab: 'votes'}),
    play: async ({canvas}) =>
        expect(within(canvas.getByRole('list', {name: 'Vote record legend'})).getAllByRole('listitem').map(li => li.textContent)).toEqual(['Aye', 'Nay', 'Split', 'Abstain', 'No vote']),
}

// with no referendum on chain there is no record to draw
export const VotesRecordNoReferenda: StoryObj = {
    ...story({account: voting('0'), referenda: []}, {tab: 'votes'}),
    play: async ({canvas}) => expect(canvas.queryByRole('list', {name: 'Vote record legend'})).toBeNull(),
}

// every vote taken off and no referendum open since, so there is no rate to give
export const VotesSummaryNoReferenda: StoryObj = {
    ...story({account: voting('0'), votes: [vote(0, {removed: true, referendum: poll(6, 'Rejected', HEAD - 100)})], counts: {referenda: 0}}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(summaries(canvasElement)).toEqual([{'All votes': '0', Active: '0', 'Participation rate': '—', 'Total locked': '0 NUMN'}]),
}

// the eight governance lists share one group
export const GovernanceTabs: StoryObj = {
    ...story(
        {account: voting(numn(3_000.5)), votes: [vote(0)], voteActions: voteActionRows(), delegationsOut: delegatingTo(3), delegationsIn: delegatedFrom(2), delegationActions: delegationActionRows(), proposed: EVERY_REFUND, payouts: EVERY_PAYOUT},
        {tab: 'vote-history'}
    ),
    play: async ({canvas}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Governance/)
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['votes', 'vote-history', 'proposed', 'treasury', 'received', 'received-history', 'delegations', 'delegations-history'])
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['1', '7', '5', '7', '2', '3', '3', '2'])
    },
}

// an account that only ever delegated has no votes, and the group opens on its delegations
export const GovernanceDelegatorOnly: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationsOut: delegatingTo(1), delegationActions: [delegationAction(0)]}, {tab: 'delegations'}),
    play: async ({canvas}) => {
        const sub = within(canvas.getByRole('navigation', {name: 'Governance'})).getAllByRole('link')
        expect(sub.map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'))).toEqual(['delegations', 'delegations-history'])
    },
}

export const VoteHistoryOne = story({account: voting(numn(1_000)), votes: [vote(0)], voteActions: [voteAction(0)]}, {tab: 'vote-history'})

// each decision and conviction label, a removal, and a vote carrying 4,500 NUMN of delegated votes
export const VoteHistoryEveryCase: StoryObj = {
    ...story({account: voting(numn(250_000)), votes: voteRows(), voteActions: voteActionRows()}, {tab: 'vote-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action')).toEqual(['Voted Aye', 'Removed Nay', 'Voted Nay', 'Voted Split', 'Voted Abstain', 'Voted Aye', 'Voted Aye'])
        expect(columnTexts(canvasElement, 'Conviction')).toEqual(['1x', '3x', '3x', '0.1x', '0.1x', '0.1x', '6x'])
        expect(columnTexts(canvasElement, 'Votes').map(t => t!.includes('delegated'))).toEqual([true, false, false, false, false, false, false])
    },
}

const manyVoteActions = Array.from({length: 45}, (_, i) => voteAction(i, {referendum: {index: 47 - i}}))

export const VoteHistoryMany = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'vote-history'})

export const VoteHistoryPage2 = story({account: voting(numn(250_000)), votes: [vote(0)], voteActions: manyVoteActions}, {tab: 'vote-history', page: '2'})

export const DelegationsHistoryOne = story({account: voting(numn(1_000.5)), delegationActions: [delegationAction(0)]}, {tab: 'delegations-history'})

// both methods out of the account, and nothing that came in
export const DelegationsHistoryEveryCase: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionRows()}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => {
        const verbs = columnTexts(canvasElement, 'Action').map(t => t!.match(/^(Delegated|Undelegated) (to|from|by)/)![0])
        expect(verbs).toEqual(['Undelegated from', 'Delegated to'])
    },
}

// both methods into the account, and a delegation its own block undid
export const ReceivedHistoryEveryCase: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionRows()}, {tab: 'received-history'}),
    play: async ({canvasElement}) => {
        const verbs = columnTexts(canvasElement, 'Action').map(t => t!.match(/^(Delegated|Undelegated) (to|from|by)/)![0])
        expect(verbs).toEqual(['Delegated by', 'Undelegated by', 'Delegated by'])
        expect(columnTexts(canvasElement, 'Amount').at(-1)).toBe('—')
        expect(columnTexts(canvasElement, 'Conviction').at(-1)).toBe('—')
    },
}

const bothSides = [...delegationActionsOf(12, 'out'), ...delegationActionsOf(30, 'in')]

export const DelegationsHistoryMany: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Action').every(t => t!.startsWith('Delegated to'))).toBe(true)
        const nav = canvasElement.querySelector('nav[aria-label="Governance"]')!
        expect(tabCount(nav, 'delegations-history')).toBe('12')
        expect(tabCount(nav, 'received-history')).toBe('30')
    },
}

export const ReceivedHistoryMany = story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'received-history'})

export const ReceivedHistoryPage2 = story({account: voting(numn(3_000.5)), delegationActions: bothSides}, {tab: 'received-history', page: '2'})

// an account that only ever delegated out has no Received history
export const ReceivedHistoryNone: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationActions: delegationActionsOf(3, 'out')}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => expect(tabCount(canvasElement.querySelector('nav[aria-label="Governance"]')!, 'received-history')).toBeNull(),
}
