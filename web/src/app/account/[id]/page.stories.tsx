import type {Decorator, StoryObj} from '@storybook/nextjs-vite'
import {WellKnownProvider} from '@/components/wellKnown'
import {ss58Encode} from '@/lib/ss58'
import {
    accountExtrinsics,
    accountPage,
    accountTransferCases,
    accountTransfers,
    delegatedFrom,
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
    PRIME_KEY,
    proxyDelegates,
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
    TRACKS,
    TREASURY,
    validatorRow,
    VERDICTS,
    vote,
    voteRows,
} from '../../../../../mock/fixtures/accounts.js'
import {at, chainInfo, hashOf, HEAD, identity, issuance, numn, PEOPLE, person, rows, transfer} from '../../../../../mock/fixtures.js'
import {DESKTOP, expectWholeWords} from '../../../../.storybook/fit'
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

export const SubIdentity = story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)})

export const SubFiledUnderAHash = story({
    account: subject({...subUnder(PEOPLE[0], 'payouts'), identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
    transfers: accountTransfers(3),
})

export const SubWithOwnIdentity = story({account: named({...identity('Aurora Payouts'), ...subUnder(PEOPLE[0], 'payouts')}), transfers: accountTransfers(3)})

export const BalanceZero = story({account: subject({...funds('0'), nonce: 4}), transfers: accountTransfers(4)})

export const BalanceExtremes = story({
    account: subject({
        ...funds(MAX_U128, numn(0.000001), MAX_U128),
        nonce: 2_147_483_647,
        firstSeenBlock: 0,
        firstSeenTimestamp: at(0),
        lastActiveBlock: HEAD,
        locksJson: [lock('democrac', MAX_U128)],
    }),
    transfers: accountTransferCases(HEAD - 3),
})

export const EveryRole = story({
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
})

// beside the identity card the H160 leaves its note little room on the line
export const EveryRoleOnDesktop: StoryObj = {
    ...EveryRole,
    globals: DESKTOP,
    play: async ({canvas}) => expectWholeWords(await canvas.findByText('mapped account of this H160')),
}

export const Treasury = story({
    account: subject({id: TREASURY.id, ...funds(issuance.treasuryPot), nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: at(0)}),
    transfers: rows(8, (h: number, i: number) => (i % 2 === 0 ? transfer(h, i, {from: TREASURY, extrinsic: null, call: null, amount: numn(5_000 * (i + 1))}) : transfer(h, i, {to: TREASURY}))),
    counts: {transfers: 312},
})

export const TransfersEmpty = story({account: subject({nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: at(0), lastActiveBlock: 0})})

export const TransfersOne = story({transfers: accountTransfers(1)})

export const TransfersMany = story({transfers: [...accountTransfers(14), ...accountTransferCases(HEAD - 100)], counts: {transfers: 137}})

export const TransfersOut = story({transfers: accountTransfers(20, 'from'), counts: {transfers: 137, from: 46}}, {tab: 'transfers', dir: 'out'})

export const TransfersIn = story({transfers: accountTransfers(20, 'to'), counts: {transfers: 137, to: 91}}, {tab: 'transfers', dir: 'in'})

export const TokensEmpty = story({account: mapped(), transfers: accountTransfers(2)}, {tab: 'tokens'})

export const TokensOne = story({account: mapped(), deploys: 1, tokens: 1, tokenTransfers: tokenTransferRows(1)}, {tab: 'tokens'})

export const TokensMany = story({account: mapped(), deploys: 2, tokenTransfers: [...tokenTransferRows(18), ...tokenTransferCases(HEAD - 200)], counts: {tokenTransfers: 64}}, {tab: 'tokens'})

export const HoldingsOne = story({account: mapped(), holdings: [HOLDING]}, {tab: 'holdings'})

export const HoldingsMany = story({account: mapped(), holdings: holdingRows(20), counts: {holdings: 33}}, {tab: 'holdings'})

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

export const TimelineMany = story(
    {
        account: named(),
        timeline: [...identityTimeline(), identitySet(HEAD - 12_000), identitySet(HEAD - 14_000), identitySet(HEAD - 16_000)],
        verdicts: timelineVerdicts(),
        counts: {timeline: 41},
    },
    {tab: 'timeline'}
)

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

export const DelegationsOut = story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'})

const SPENDERS = TRACKS.filter(t => t.name.endsWith('_spender'))

export const DelegationsIn = story({delegationsIn: delegatedFrom(20, SPENDERS), counts: {tracks: {30: 18, 31: 15, 32: 12}}}, {tab: 'delegations'})

export const DelegationsTrackFilter = story({delegationsIn: delegatedFrom(20, SPENDERS.slice(0, 1)), counts: {tracks: {30: 26, 31: 15, 32: 12}}}, {tab: 'delegations', dtrack: '30'})

export const DelegationsBoth = story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(5)}, {tab: 'delegations'})

const proxied = (n: number) => subject({...funds(numn(1250.5), numn(1.75 * n)), depositsJson: [{id: 'proxy', amount: numn(1.75 * n)}]})

export const ProxiesOut = story({account: proxied(1), proxiesOut: proxyDelegates(1)}, {tab: 'proxies'})

export const ProxiesIn = story({proxiesIn: proxyFor(2)}, {tab: 'proxies'})

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
