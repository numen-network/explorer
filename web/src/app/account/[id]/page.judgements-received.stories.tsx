import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {accountTransfers, funds, reservedOf, VERDICTS} from '../../../../../mock/fixtures/accounts.js'
import {identity, numn} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, IDENTITY_DEPOSIT, FEE_PAID, named} from './page.stories.helpers'

export default {title: 'Pages/Account/Identity | Judgements', ...pageMeta(AccountPage), decorators: [wellKnown]}

// one seat per verdict, and only the paid request still holds a fee
export const EveryVerdict: StoryObj = {
    ...story(
        {
            account: named({...identity('Aurora Labs', {judgements: VERDICTS}), ...funds(numn(48_210.75), reservedOf(IDENTITY_DEPOSIT, FEE_PAID))}),
            transfers: accountTransfers(3),
        },
        {tab: 'judgements-received'},
    ),
    play: async ({canvasElement}) => {
        expect(columnTexts(canvasElement, 'Judgement')).toEqual(VERDICTS)
        expect(columnTexts(canvasElement, 'Reserved fee')).toEqual(VERDICTS.map(v => (v === 'FeePaid' ? '2.5 NUMN' : '—')))
    },
}
