import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {accountTransfers, funds, reservedOf, VERDICTS} from '../../../../../mock/fixtures/accounts.js'
import {identity, numn} from '../../../../../mock/fixtures.js'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, IDENTITY_DEPOSIT, FEE_PAID, named, subTabs} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Judgements', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const Unjudged: StoryObj = {
    ...story({account: named(identity('Aurora Labs', {judgements: []})), transfers: accountTransfers(3)}, {tab: 'direct'}),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Identity')).toEqual(['direct']),
}

export const EveryVerdict: StoryObj = {
    ...story(
        {
            account: named({...identity('Aurora Labs', {judgements: VERDICTS}), ...funds(numn(48_210.75), reservedOf(IDENTITY_DEPOSIT, FEE_PAID))}),
            transfers: accountTransfers(3),
        },
        {tab: 'judgements-received'},
    ),
    play: async ({canvasElement}) => expect(subTabs(canvasElement, 'Identity')).toEqual(['direct', 'judgements-received']),
}
