import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {ss58Encode} from '@/lib/ss58'
import {accountTransfers, subject, SUBJECT, subUnder} from '../../../../../mock/fixtures/accounts.js'
import {chainInfo, hashOf, identity, PEOPLE} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, rowValue, AURORA, named, heading, addressLine, subTabs} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Direct', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const WithoutDisplay: StoryObj = {
    ...story({account: named({...identity(null, AURORA), username: 'aurora.numen'}), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Display')).toBe('—')
        expect(addressLine(canvasElement)).toBe(`aurora.numen|${ss58Encode(SUBJECT, chainInfo.ss58)}`)
    },
}

// a sub set through set_subs raises no event naming it, so Direct stands alone
export const SubOnly: StoryObj = {
    ...story({account: subject(subUnder(PEOPLE[0], 'payouts')), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvas, canvasElement}) => {
        expect(heading(canvasElement)).toBe('Polaris Guild/payouts')
        expect(subTabs(canvasElement, 'Identity')).toEqual(['direct'])
        expect(canvas.getByText('No direct identity')).toBeVisible()
    },
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
