import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {
    accountExtrinsics,
    accountPage,
    accountTransferCases,
    accountTransfers,
    delegatedFrom,
    delegatedOnTracks,
    delegatingTo,
    FULL_FIELDS,
    funds,
    HOLDING,
    holdingRows,
    identitySet,
    identityTimeline,
    judgementsGiven,
    ME,
    MAX_U128,
    minedDays,
    MULTISIG_ENDS,
    multisigOp,
    multisigOps,
    NOT_HELD,
    PRIME_KEY,
    proxyDelegates,
    proxyDelays,
    proxyFor,
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
    validatorRow,
    VERDICTS,
    vote,
    voteRows,
} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, hashOf, HEAD, identity, issuance, numn, PEOPLE, person, rows, transfer} from '../../../../../mock/fixtures.js'
import {columnTexts, expectFits, expectNamedNavs, expectWholeWords, filterChips, filterOptions, tabCount, tokenLabels} from '../../../../.storybook/fit'
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

const rowValue = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'div'}).nextElementSibling!.textContent

const IDENTITY_DEPOSIT = numn(5.41)
const FEE_PAID = numn(2.5)
const AURORA = {judgements: ['Reasonable'], web: 'aurora.example', x: '@aurora_labs', discord: 'auroralabs'}

const named = (traits = {}) => subject({...identity('Aurora Labs', AURORA), ...funds(numn(48_210.75), IDENTITY_DEPOSIT), ...traits})
const mapped = (traits = {}) => subject({evmAddress: SUBJECT_EVM, ...traits})
const lock = (id: string, amount: string) => ({id, amount, reasons: id === 'validatr' ? 'All' : 'Misc'})
const schedule = (locked: number, perBlock: number, startingBlock: number) => ({locked: numn(locked), perBlock: numn(perBlock), startingBlock})

export const IdentityNone = story({transfers: accountTransfers(5)})

export const IdentityFull = story({account: named(identity('Aurora Labs', FULL_FIELDS)), transfers: accountTransfers(3)})

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
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Username')).toBe('aurora.numen'),
}

export const SubIdentity = story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)})

export const SubFiledUnderAHash: StoryObj = {
    ...story({
        account: subject({...subUnder(PEOPLE[0], 'payouts'), identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
        transfers: accountTransfers(3),
    }),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe(`Polaris Guild/BlakeTwo256 ${hashOf('sub', 1)}`),
}

export const SubWithOwnIdentity = story({account: named({...identity('Aurora Payouts'), ...subUnder(PEOPLE[0], 'payouts')}), transfers: accountTransfers(3)})

export const BalanceZero = story({account: subject({...funds('0'), nonce: 4}), transfers: accountTransfers(4)})

export const BalanceExtremes = story({
    account: subject({
        ...funds(MAX_U128, numn(0.000001), MAX_U128),
        nonce: 2_147_483_647,
        firstSeenBlock: 0,
        firstSeenTimestamp: null,
        lastActiveBlock: HEAD,
        locksJson: [lock('democrac', MAX_U128)],
    }),
    transfers: accountTransferCases(HEAD - 3),
})

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
        multisigOps: [multisigOp(0, {multisig: ME, depositor: PEOPLE[1], signatories: SIGNATORIES, threshold: 3})],
        proxiesIn: proxyFor(2),
        transfers: accountTransfers(4),
    }),
    play: async ({canvas}) => expectWholeWords(await canvas.findByText('mapped account of this H160')),
}

const roles = (root: HTMLElement) => [...within(root).getByRole('heading', {name: 'Account'}).parentElement!.querySelectorAll('[data-slot=badge]')].map(b => b.textContent)

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

// born at genesis, which carries no timestamp, so its active age has no figure
export const Treasury: StoryObj = {
    ...story({
        account: subject({id: TREASURY.id, ...funds(issuance.treasuryPot), nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null}),
        transfers: rows(8, (h: number, i: number) => (i % 2 === 0 ? transfer(h, i, {from: TREASURY, extrinsic: null, call: null, amount: numn(5_000 * (i + 1))}) : transfer(h, i, {to: TREASURY}))),
        counts: {transfers: 312},
    }),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'First seen')).toBe('#0active age —'),
}

export const TransfersEmpty: StoryObj = {
    ...story({account: subject({nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null, lastActiveBlock: 0})}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No transfers yet.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Direction')).toEqual(['[All]', 'Out', 'In'])
    },
}

export const TransfersOne = story({transfers: accountTransfers(1)})

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
            '0xe2e2e…e2e2',
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
        {index: 9, submissionDepositor: SUBJECT, submissionDeposit: numn(5), decisionDepositor: SUBJECT, decisionDeposit: numn(1_000)},
        {index: 8, submissionDepositor: SUBJECT, submissionDeposit: numn(5), decisionDepositor: person(13).id, decisionDeposit: numn(200)},
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

export const VestingSchedules = story(
    {
        account: subject({
            ...funds(numn(1_171_250.5), '0', numn(520_000)),
            vestingJson: [schedule(120_000, 0.5, HEAD + 10_000), PARTIAL, schedule(50_000, 0.25, 100_000)],
            locksJson: [lock('vesting', numn(520_000))],
        }),
    },
    {tab: 'vesting'}
)

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

export const ValidatorActive = story({account: staked(), validator: validatorRow()}, {tab: 'validator'})

export const ValidatorInactive = story({validator: validatorRow({active: false, lockedAmount: '0', lockExpiry: null, lastActiveSession: 15_210})}, {tab: 'validator'})

export const ValidatorKicked = story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}, offlineSessions: 12})}, {tab: 'validator'})

export const MiningOneDay = story({minerDays: minedDays(1)}, {tab: 'mining'})

export const MiningMany = story({minerDays: minedDays(60)}, {tab: 'mining'})

export const MiningBeyondChart = story({minerDays: minedDays(60), counts: {mined: 48_213}}, {tab: 'mining'})

const voting = (amount: string) => subject({...funds(numn(1250.5), '0', amount), locksJson: [lock('pyconvot', amount)]})

// nobody delegates to this account, so the Delegated from list and its filter don't show
export const DelegationsOut: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvas}) => {
        await expect(canvas.getByText('Delegating to')).toBeInTheDocument()
        await expect(canvas.queryByText('Delegated from')).toBeNull()
    },
}

const SPENDERS = TRACKS.filter(t => t.name.endsWith('_spender'))

export const DelegationsIn = story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'delegations'})

export const DelegationsTrackFilter = story({delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'delegations', dtrack: '30'})

// a link to a track nobody delegates on any more picks that track at 0
export const DelegationsTrackFilterEmpty: StoryObj = {
    ...story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'delegations', dtrack: '0'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching delegations.')).toBeInTheDocument()
        expect(await filterOptions(canvasElement, 'Track')).toEqual(['All 45', '[Root 0]', 'Runtime Upgrade 0', 'Wish For Change 0', 'Identity Admin 0', 'Referendum Canceller 0', 'Referendum Killer 0', 'Small Spender 18', 'Medium Spender 15', 'Big Spender 12'])
    },
}

// Delegating to rows and Track options go by track id, two-digit ids after the single digits
export const DelegationsBoth: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'delegations'}),
    play: async ({canvas, canvasElement}) => {
        const out = canvas.getByRole('columnheader', {name: 'Delegating to'}).closest('table')!
        await expect(columnTexts(out, 'Track')).toEqual(['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender'])
        await expect(await filterOptions(canvasElement, 'Track')).toEqual(['[All 5]', 'Root 1', 'Runtime Upgrade 1', 'Wish For Change 1', 'Identity Admin 1', 'Referendum Canceller 1', 'Referendum Killer 0', 'Small Spender 0', 'Medium Spender 0', 'Big Spender 0'])
    },
}

// one account delegating the same balance on every track, its rows in track order with two-digit ids after the single digits
export const DelegationsInEveryTrack: StoryObj = {
    ...story({delegationsIn: delegatedOnTracks(person(1), TRACKS, numn(5_000))}, {tab: 'delegations'}),
    play: async ({canvasElement}) =>
        expect(columnTexts(canvasElement, 'Track')).toEqual(['Root', 'Runtime Upgrade', 'Wish For Change', 'Identity Admin', 'Referendum Canceller', 'Referendum Killer', 'Small Spender', 'Medium Spender', 'Big Spender']),
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
        await expect(columnTexts(canvasElement, 'Delay')).toEqual(['—', '14,400'])
    },
}

export const ProxiesBoth = story({account: proxied(9), proxiesOut: proxyDelegates(9), proxiesIn: proxyFor(3)}, {tab: 'proxies'})

export const ProxiesInMany = story({proxiesIn: proxyFor(45)}, {tab: 'proxies'})

export const ProxiesInPage2 = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: '2'})

export const ProxiesInLastPage = story({proxiesIn: proxyFor(45)}, {tab: 'proxies', page: lastPage(45)})

export const MultisigOne = story({multisigOps: [multisigOp(0)]}, {tab: 'multisig'})

export const MultisigMember = story({account: subject({...funds(numn(1250.5), reservedOf(numn(20.088), numn(20.088)))}), multisigOps: multisigOps()}, {tab: 'multisig'})

export const MultisigAccount = story(
    {multisigOps: MULTISIG_ENDS.map((end, i) => multisigOp(i, {threshold: 3, ...end, multisig: ME, depositor: person(i), signatories: SIGNATORIES}))},
    {tab: 'multisig'}
)

const manyOps = Array.from({length: 45}, (_, i) => multisigOp(i, {threshold: 3, ...MULTISIG_ENDS[i % MULTISIG_ENDS.length], multisig: ME, depositor: person(i), signatories: SIGNATORIES}))

export const MultisigMany = story({multisigOps: manyOps}, {tab: 'multisig'})

export const MultisigPage2 = story({multisigOps: manyOps}, {tab: 'multisig', page: '2'})

export const MultisigLastPage = story({multisigOps: manyOps}, {tab: 'multisig', page: lastPage(manyOps.length)})

export const VotesOne = story({account: voting(numn(1_000)), votes: [vote(0)]}, {tab: 'votes'})

const manyVotes = [...voteRows(), ...Array.from({length: 35}, (_, i) => vote(i + 10, {referendum: {index: 47 - i, status: 'Ongoing', endedAt: null}}))]

export const VotesMany = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes'})

export const VotesPage2 = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: '2'})

export const VotesLastPage = story({account: voting(numn(250_000)), votes: manyVotes}, {tab: 'votes', page: lastPage(manyVotes.length)})

// votes cast in one block list the newest referendum first, #10 between #11 and #9
export const VotesInOneBlock: StoryObj = {
    ...story({account: voting(numn(3_000)), votes: [11, 10, 9].map((index, i) => vote(i, {block: HEAD - 500, referendum: {index, status: 'Ongoing', endedAt: null}}))}, {tab: 'votes'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Referendum')).toEqual(['#11', '#10', '#9']),
}
