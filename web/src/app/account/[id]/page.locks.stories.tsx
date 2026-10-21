import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {funds, ME, MULTISIG_ENDS, multisigOp, proxyDelegates, reservedOf, subject, subRows, validatorRow, vote} from '../../../../../mock/fixtures/accounts.js'
import {identity, numn, person} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, IDENTITY_DEPOSIT, FEE_PAID, named, lock, PARTIAL} from './page.stories.helpers'

export default {title: 'Pages/Account/Locks', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: subject({...funds(numn(1250.5), '0', numn(800)), locksJson: [lock('pyconvot', numn(800))]}), votes: [vote(0, {balance: numn(800)})]}, {tab: 'locks'})

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

const EVERY_SOURCE = [
    'Vesting',
    'Validator stake',
    'Conviction voting',
    'democrac',
    'Preimage hold',
    'Session hold',
    'Identity deposit',
    'Registrar #1 judgement fee',
    'Retired registrar #3 judgement fee',
    'Sub identity deposits (2)',
    'Proxy deposit (2)',
    'Announcement deposit',
    'Username deposits',
    'Referendum #9 submission deposit',
    'Referendum #9 decision deposit',
    'Referendum #8 submission deposit',
    'Referendum #7 submission deposit',
    'Bounty #2 proposal deposit',
    'Bounty #5 curator deposit',
    'Child bounty #5-1 curator deposit',
    'Multisig deposit',
    'Unattributed',
]

// a row for every source a lock or a reserve can come from, an unknown lock id by its own name
export const EverySource: StoryObj = {
    ...story(
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
    ),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Source')).toEqual(EVERY_SOURCE),
}

const curating = [[2, 9], [2, 10], [2, 11], [10, 1]].map(([index, childIndex]) => ({parent: {index}, childIndex, curatorDeposit: numn(25)}))

// child bounty deposits go by parent then child, #2-10 between #2-9 and #2-11 and parent #10 after #2
export const ChildBounties: StoryObj = {
    ...story({account: subject(funds(numn(1250.5), numn(100))), childCurated: curating.length, childBountyDeposits: curating}, {tab: 'locks'}),
    play: async ({canvasElement}) =>
        expect(columnTexts(canvasElement, 'Source')).toEqual(['#2-9', '#2-10', '#2-11', '#10-1'].map(child => `Child bounty ${child} curator deposit`)),
}
