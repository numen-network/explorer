import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {accountTransfers, subject, subUnder} from '../../../../../mock/fixtures/accounts.js'
import {hashOf, identity, PEOPLE} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, rowValue, AURORA, named} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Direct', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const WithoutDisplay: StoryObj = {
    ...story({account: named(identity(null, AURORA)), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe('—'),
}

// an account that is only a sub has no registration of its own to show
export const SubOnly: StoryObj = {
    ...story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvas}) => expect(canvas.getByText('No direct identity')).toBeVisible(),
}

export const SubFiledUnderAHash: StoryObj = {
    ...story(
        {
            account: subject({...subUnder(PEOPLE[0], 'payouts'), identitySubName: null, identitySubData: {__kind: 'BlakeTwo256', value: hashOf('sub', 1)}}),
            transfers: accountTransfers(3),
        },
        {tab: 'direct'},
    ),
    play: async ({canvasElement}) => expect(rowValue(canvasElement, 'Display')).toBe(`Polaris Guild/BlakeTwo256 ${shortHash(hashOf('sub', 1))}`),
}

export const SubWithOwnRegistration = story({account: named({...identity('Aurora Payouts'), ...subUnder(PEOPLE[0], 'payouts')}), transfers: accountTransfers(3)}, {tab: 'direct'})
