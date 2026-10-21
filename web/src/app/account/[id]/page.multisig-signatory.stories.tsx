import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {funds, membership, memberships, multisigOp, multisigOps, reservedOf, subject} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, strip} from './page.stories.helpers'

export default {title: 'Pages/Account/Multisig | As a multisig signatory', ...pageMeta(AccountPage), decorators: [wellKnown]}

// a multisig link opens the signatory side of an account that is no multisig
export const FromMultisigLink: StoryObj = {
    ...story({multisigOps: [multisigOp(0)], memberships: [membership(0)]}, {tab: 'multisig'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'Multisig', 'tab')).toEqual([['multisig-signatory', '1', 'page']])
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab')).toEqual([
            ['operations', '1', 'page'],
            ['memberships', '1', null],
        ])
    },
}

export const Member = story(
    {account: subject({...funds(numn(1250.5), reservedOf(numn(20.088), numn(20.088)))}), multisigOps: multisigOps(), memberships: memberships(3)},
    {tab: 'multisig-signatory'}
)

export const Memberships: StoryObj = {
    ...story({multisigOps: multisigOps(), memberships: memberships(3)}, {tab: 'multisig-signatory', mtab: 'memberships'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab').map(l => l[2])).toEqual([null, 'page'])
        expect(within(canvasElement).getByRole('columnheader', {name: 'Pending'})).toBeInTheDocument()
    },
}

const manyMemberships = memberships(45)

export const MembershipsPage2 = story({multisigOps: multisigOps(), memberships: manyMemberships}, {tab: 'multisig-signatory', mtab: 'memberships', page: '2'})
