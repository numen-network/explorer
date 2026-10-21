import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {funds, reservedOf, subRows} from '../../../../../mock/fixtures/accounts.js'
import {numn} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, IDENTITY_DEPOSIT, named, subTabs} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Sub', ...pageMeta(AccountPage), decorators: [wellKnown]}

const withSubs = (n: number) => named({...funds(numn(48_210.75), reservedOf(IDENTITY_DEPOSIT, numn(2.01 * n))), depositsJson: [{id: 'subs', amount: numn(2.01 * n)}]})

export const One: StoryObj = {
    ...story({account: withSubs(1), subs: subRows(1)}, {tab: 'subs'}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Identity')).toEqual(['direct', 'subs', 'judgements-received']),
}

export const Many = story({account: withSubs(34), subs: subRows(20), counts: {subs: 34}}, {tab: 'subs'})
