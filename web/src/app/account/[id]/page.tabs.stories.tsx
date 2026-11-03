import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {accountTransfers, delegatedFrom, delegatedVoteActionRows, delegatedVoteOut, delegationAction, delegationActionRows, delegationActionsOf, EVERY_PAYOUT, EVERY_REFUND, funds, HOLDING, identitySet, JJFU_OFFLINE, membership, MULTISIG_ENDS, multisigOp, NOT_HELD, proxyFor, seatEntries, seatTimeline, seatVerdicts, subject, SUBJECT_EVM, subRows, subUnder, tokenTransferRows, validatorLifecycle, validatorRow, vote, voteActionRows} from '../../../../../mock/fixtures/accounts.js'
import {HEAD, identity, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, named, mapped, staked, subTabs, strip, governanceTabs, asAddress, lock, PARTIAL} from './page.stories.helpers'

export default {title: 'Pages/Account/Tabs', ...pageMeta(AccountPage), decorators: [wellKnown]}

const accountTabs = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Account'}))
const openTab = (root: HTMLElement, name: string) => within(within(root).getByRole('navigation', {name})).getByRole('link', {current: 'page'})

// every group links its first tab and sums its tabs' counts.
// Direct and Charts go uncounted, so Identity and Charts show no count
export const EveryAccountTab: StoryObj = {
    ...story({
        account: subject({...subUnder(PEOPLE[0], 'payouts'), ...funds(numn(1_001_250.5), '0', numn(400_000)), evmAddress: SUBJECT_EVM, vestingJson: [PARTIAL], locksJson: [lock('vesting', numn(400_000))]}),
        transfers: accountTransfers(3),
        tokenTransfers: tokenTransferRows(2),
        holdings: [HOLDING],
        registrar: 2,
        seatEvents: seatTimeline(),
        verdicts: seatVerdicts(),
        entries: seatEntries(),
        validator: validatorRow({active: false, status: 'Kicked', kicked: {__kind: 'Offline'}}),
        offences: JJFU_OFFLINE,
        steps: validatorLifecycle(),
        proxiesIn: proxyFor(2),
        multisigOps: [multisigOp(0)],
        memberships: [membership(0)],
        votes: [vote(0)],
        counts: {extrinsics: 4, mined: 9, accountDays: 3},
    }),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Account', 'tab')).toEqual([
            ['transfers', '5', 'page'],
            ['holdings', '1', null],
            ['extrinsics', '4', null],
            ['locks', '1', null],
            ['vesting', '1', null],
            ['direct', null, null],
            ['registrar-current', '11', null],
            ['validator-timeline', '7', null],
            ['mining', '9', null],
            ['proxies', '2', null],
            ['multisig-signatory', '1', null],
            ['direct-votes', '1', null],
            ['charts', null, null],
        ]),
}

// an account with no history has only the two tabs every account gets, both at zero
export const BareAccountTabs: StoryObj = {
    ...story({}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Account', 'tab')).toEqual([
            ['transfers', '0', 'page'],
            ['extrinsics', '0', null],
        ]),
}

// native and token transfers each get a tab with its count, and their counterparties an uncounted third
export const EveryTransfersTab: StoryObj = {
    ...story({account: mapped(), transfers: accountTransfers(3), tokenTransfers: tokenTransferRows(2)}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Transfers', 'tab')).toEqual([
            ['transfers', '3', 'page'],
            ['tokens', '2', null],
            ['counterparties', null, null],
        ]),
}

// no transfer either way leaves the Counterparties tab out
export const NoCounterpartiesTab: StoryObj = {
    ...story({}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Transfers')).toEqual(['transfers']),
}

// with nothing held there is no Tokens tab, and a link to it opens the first tab
export const NoTokensTab: StoryObj = {
    ...story({account: mapped(), transfers: accountTransfers(2), notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'holdings')).toBeNull()
        expect(openTab(canvasElement, 'Account')).toHaveAccessibleName(/^Transfers/)
        expect(openTab(canvasElement, 'Transfers')).toHaveAccessibleName(/^Native/)
    },
}

// a token at a zero balance or with no answer to balanceOf is not counted on the Tokens tab
export const TokensCountHeldOnly: StoryObj = {
    ...story({account: mapped(), holdings: [HOLDING], notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => expect(tabCount(canvasElement, 'holdings')).toBe('1'),
}

// an identity with subs, a judgement and events of its own shows all four Identity tabs, Direct uncounted
export const EveryIdentityTab: StoryObj = {
    ...story({account: named(), subs: subRows(2), timeline: [identitySet(HEAD - 10_000)]}, {tab: 'direct'}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Identity', 'tab')).toEqual([
            ['direct', null, 'page'],
            ['subs', '2', null],
            ['judgements-received', '1', null],
            ['timeline', '1', null],
        ]),
}

// an identity nobody judged has no Judgements tab
export const IdentityUnjudged: StoryObj = {
    ...story({account: named(identity('Aurora Labs', {judgements: []})), timeline: [identitySet(HEAD - 10_000)]}, {tab: 'direct'}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Identity')).toEqual(['direct', 'timeline']),
}

// a sub set through set_subs raises no event naming it, so Direct stands alone
export const IdentitySubOnly: StoryObj = {
    ...story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Identity')).toEqual(['direct']),
}

// a username alone opens no Identity tab
export const UsernameOnlyNoIdentityTab: StoryObj = {
    ...story({account: subject({username: 'aurora.numen'}), transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(accountTabs(canvasElement).queryByRole('link', {name: /^Identity/})).toBeNull(),
}

// a registrar's Current and History tabs, each counted
export const EveryRegistrarTab: StoryObj = {
    ...story({account: named(), registrar: 2, refs: PEOPLE, seatEvents: seatTimeline(), verdicts: seatVerdicts(), entries: seatEntries()}, {tab: 'registrar-current'}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Registrar', 'tab')).toEqual([
            ['registrar-current', '4', 'page'],
            ['registrar', '7', null],
        ]),
}

// a validator's two tabs, each counted
export const EveryValidatorTab: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, status: 'Kicked', kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE, steps: validatorLifecycle()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Validator', 'tab')).toEqual([
            ['validator-timeline', '5', 'page'],
            ['validator', '2', null],
        ]),
}

// an exemption alone leaves no Validator row, so the group has its timeline alone
export const ValidatorExemptOnly: StoryObj = {
    ...story({steps: validatorLifecycle().slice(-1)}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Validator')).toEqual(['validator-timeline']),
}

// a multisig that signs for another multisig stands on both sides
export const EveryMultisigTab: StoryObj = {
    ...story({multisigOps: [...asAddress(2), multisigOp(10)], memberships: [membership(0)]}, {tab: 'multisig'}),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([
            ['multisig', '2', 'page'],
            ['multisig-signatory', '1', null],
        ]),
}

// a multisig that signs for no other multisig has its address side alone
export const MultisigAddressOnly: StoryObj = {
    ...story({multisigOps: asAddress(MULTISIG_ENDS.length)}, {tab: 'multisig'}),
    play: async ({canvasElement}) => expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([['multisig', String(MULTISIG_ENDS.length), 'page']]),
}

// a multisig link opens the signatory side of an account that is no multisig
export const MultisigLinkOpensSignatory: StoryObj = {
    ...story({multisigOps: [multisigOp(0)], memberships: [membership(0)]}, {tab: 'multisig'}),
    play: async ({canvasElement}) => expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([['multisig-signatory', '1', 'page']]),
}

// the eleven governance lists share one group. Delegations counts one row, the delegate the account let go of
export const EveryGovernanceTab: StoryObj = {
    ...story(
        {account: voting(numn(3_000.5)), votes: [vote(0)], voteActions: voteActionRows(), delegatedVotesOut: [delegatedVoteOut(0, 'Approved'), delegatedVoteOut(1, 'Ongoing')], delegatedVoteActions: delegatedVoteActionRows(), delegationsIn: delegatedFrom(2), delegationActions: delegationActionRows(), proposed: EVERY_REFUND, payouts: EVERY_PAYOUT},
        {tab: 'direct-vote-history'}
    ),
    play: async ({canvas}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Governance/)
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['direct-votes', 'direct-vote-history', 'delegated-votes', 'delegated-vote-history', 'delegator-tracks', 'delegators', 'delegator-history', 'delegations', 'delegation-history', 'proposed', 'treasury'])
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['1', '10', '2', '6', '2', '2', '3', '1', '3', '5', '7'])
    },
}

// an account that only ever delegated has no vote tabs, so its Governance group opens on Delegations
export const GovernanceOpensOnDelegations: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationActions: [delegationAction(0)]}, {tab: 'delegations'}),
    play: async ({canvasElement}) => {
        const group = accountTabs(canvasElement).getByRole('link', {name: /^Governance/})
        expect(new URL(group.getAttribute('href')!, 'http://x').searchParams.get('tab')).toBe('delegations')
        expect(subTabs(canvasElement, 'Governance')).toEqual(['delegations', 'delegation-history'])
    },
}

// nobody delegates to this account, so there are no Delegator tracks or Delegators tabs
export const NoDelegatorTabs: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationActions: delegationActionsOf(3, 'out')}, {tab: 'delegations'}),
    play: async ({canvasElement}) => expect(governanceTabs(canvasElement)).toEqual({delegations: true, 'delegation-history': false}),
}

// an account that only ever delegated out has no Delegator history tab
export const NoDelegatorHistoryTab: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationActions: delegationActionsOf(3, 'out')}, {tab: 'delegation-history'}),
    play: async ({canvasElement}) => expect(governanceTabs(canvasElement)).toEqual({delegations: false, 'delegation-history': true}),
}

// an account with no day rows has no Charts tab
export const NoChartsTab: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(accountTabs(canvasElement).queryByRole('link', {name: /^Charts/})).toBeNull(),
}
