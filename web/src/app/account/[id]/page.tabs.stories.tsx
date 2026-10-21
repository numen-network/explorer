import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {accountTransfers, delegatedFrom, delegatingTo, delegationAction, delegationActionRows, delegationActionsOf, EVERY_PAYOUT, EVERY_REFUND, HOLDING, identitySet, JJFU_OFFLINE, membership, MULTISIG_ENDS, multisigOp, NOT_HELD, subject, subRows, subUnder, TRACKS, tokenTransferRows, validatorLifecycle, validatorRow, vote, voteActionRows} from '../../../../../mock/fixtures/accounts.js'
import {HEAD, identity, numn, PEOPLE} from '../../../../../mock/fixtures.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, voting, named, mapped, staked, subTabs, strip, governanceTabs, tileAboveTabs, asAddress} from './page.stories.helpers'

export default {title: 'Pages/Account/Tabs', ...pageMeta(AccountPage), decorators: [wellKnown]}

const accountTabs = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Account'}))
const openTab = (root: HTMLElement, name: string) => within(within(root).getByRole('navigation', {name})).getByRole('link', {current: 'page'})

// every navigation landmark carries a name of its own, the account strip, a group's strip, the view strip inside a tab and the pager
export const NavsNamed: StoryObj = {
    ...story({delegationsIn: delegatedFrom(3)}, {tab: 'received', rtab: 'delegators'}),
    play: async ({canvas}) => expect(canvas.getAllByRole('navigation').map(nav => nav.getAttribute('aria-label'))).toEqual(['Account', 'Governance', 'Received', 'pagination']),
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

// a validator's two tabs, counted, under the tile they share
export const EveryValidatorTab: StoryObj = {
    ...story({account: staked(), validator: validatorRow({active: false, kicked: {__kind: 'Offline'}}), offences: JJFU_OFFLINE, steps: validatorLifecycle()}, {tab: 'validator-timeline'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'Validator', 'tab')).toEqual([
            ['validator-timeline', '5', 'page'],
            ['validator', '2', null],
        ])
        expect(tileAboveTabs(canvasElement)).toBe(true)
    },
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

// the eight governance lists share one group
export const EveryGovernanceTab: StoryObj = {
    ...story(
        {account: voting(numn(3_000.5)), votes: [vote(0)], voteActions: voteActionRows(), delegationsOut: delegatingTo(3), delegationsIn: delegatedFrom(2), delegationActions: delegationActionRows(), proposed: EVERY_REFUND, payouts: EVERY_PAYOUT},
        {tab: 'vote-history'}
    ),
    play: async ({canvas}) => {
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Governance/)
        const nav = canvas.getByRole('navigation', {name: 'Governance'})
        const slugs = within(nav).getAllByRole('link').map(a => new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab')!)
        expect(slugs).toEqual(['votes', 'vote-history', 'proposed', 'treasury', 'received', 'received-history', 'delegations', 'delegations-history'])
        expect(slugs.map(slug => tabCount(nav, slug))).toEqual(['1', '10', '5', '7', '2', '3', '3', '3'])
    },
}

// an account that only ever delegated has no vote tabs, so its Governance group opens on Delegations
export const GovernanceOpensOnDelegations: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationsOut: delegatingTo(1), delegationActions: [delegationAction(0)]}, {tab: 'delegations'}),
    play: async ({canvasElement}) => {
        const group = accountTabs(canvasElement).getByRole('link', {name: /^Governance/})
        expect(new URL(group.getAttribute('href')!, 'http://x').searchParams.get('tab')).toBe('delegations')
        expect(subTabs(canvasElement, 'Governance')).toEqual(['delegations', 'delegations-history'])
    },
}

// nobody delegates to this account, so there is no Received tab
export const NoReceivedTab: StoryObj = {
    ...story({account: voting(numn(3_000.5)), delegationsOut: delegatingTo(3)}, {tab: 'delegations'}),
    play: async ({canvasElement}) => expect(governanceTabs(canvasElement)).toEqual({delegations: true}),
}

// an account that only ever delegated out has no Received history tab
export const NoReceivedHistoryTab: StoryObj = {
    ...story({account: voting(numn(1_000.5)), delegationActions: delegationActionsOf(3, 'out')}, {tab: 'delegations-history'}),
    play: async ({canvasElement}) => expect(governanceTabs(canvasElement)).toEqual({'delegations-history': true}),
}

// a delegations link carrying a Track filter opens Received
export const DelegationsLinkOpensReceived: StoryObj = {
    ...story({account: voting(numn(7_001.5)), delegationsOut: delegatingTo(7), delegationsIn: delegatedFrom(3, TRACKS.filter(t => t.name === 'small_spender'))}, {tab: 'delegations', dtrack: '30'}),
    play: async ({canvasElement}) => expect(governanceTabs(canvasElement)).toEqual({delegations: false, received: true}),
}

// an account with no day rows has no Charts tab
export const NoChartsTab: StoryObj = {
    ...story({transfers: accountTransfers(3)}),
    play: async ({canvasElement}) => expect(accountTabs(canvasElement).queryByRole('link', {name: /^Charts/})).toBeNull(),
}
