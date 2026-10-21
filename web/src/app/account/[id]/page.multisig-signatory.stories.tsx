import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {funds, memberships, multisigOps, reservedOf, subject} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, strip} from './page.stories.helpers'

export default {title: 'Pages/Account/Multisig | As a multisig signatory', ...pageMeta(AccountPage), decorators: [wellKnown]}

// the signatory side opens on the operations, the memberships a tab away
export const Operations: StoryObj = {
    ...story(
        {account: subject({...funds(numn(1250.5), reservedOf(numn(20.088), numn(20.088)))}), multisigOps: multisigOps(), memberships: memberships(3)},
        {tab: 'multisig-signatory'}
    ),
    play: async ({canvasElement}) =>
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab')).toEqual([
            ['operations', '6', 'page'],
            ['memberships', '3', null],
        ]),
}

// the other view lists each multisig the account signs for, with its pending calls
export const MembershipsView: StoryObj = {
    ...story({multisigOps: multisigOps(), memberships: memberships(3)}, {tab: 'multisig-signatory', mtab: 'memberships'}),
    play: async ({canvasElement}) => {
        expect(strip(canvasElement, 'As a multisig signatory', 'mtab').map(l => l[2])).toEqual([null, 'page'])
        expect(within(canvasElement).getByRole('columnheader', {name: 'Pending'})).toBeInTheDocument()
    },
}

const manyMemberships = memberships(45)

export const MembershipsPage2 = story({multisigOps: multisigOps(), memberships: manyMemberships}, {tab: 'multisig-signatory', mtab: 'memberships', page: '2'})
