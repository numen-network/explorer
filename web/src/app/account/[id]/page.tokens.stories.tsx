import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {accountTransfers, tokenTransferCases, tokenTransferPoisoning, tokenTransferRows, tokenTransfersInOneTx} from '../../../../../mock/fixtures/accounts.js'
import {HEAD} from '../../../../../mock/fixtures.js'
import {columnTexts} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, mapped} from './page.stories.helpers'

export default {title: 'Pages/Account/Transfers | Tokens', ...pageMeta(AccountPage), decorators: [wellKnown]}

const params = (a: Element) => Object.fromEntries(new URL((a as HTMLAnchorElement).href).searchParams)

export const Empty = story({account: mapped(), transfers: accountTransfers(2)}, {tab: 'tokens'})

export const One: StoryObj = {
    ...story({account: mapped(), tokenTransfers: tokenTransferRows(1)}, {tab: 'tokens'}),
    play: async ({canvasElement}) => expect(columnTexts(canvasElement, 'Token')).toEqual(['WTMR']),
}

export const Many = story({account: mapped(), tokenTransfers: [...tokenTransferRows(18), ...tokenTransferCases(HEAD - 200)], counts: {tokenTransfers: 64}}, {tab: 'tokens'})

// the filter off lists the zero transfers too, and its chip turns it on
export const HideRiskyOff: StoryObj = {
    ...story({account: mapped(), tokenTransfers: tokenTransferPoisoning()}, {tab: 'tokens'}),
    play: async ({canvas}) => expect(params(canvas.getByRole('link', {name: 'Hide risky txns'}))).toEqual({tab: 'tokens', hide: 'risky'}),
}

// the filter on, its chip turns it back off and every pager link keeps it
export const HideRisky: StoryObj = {
    ...story({account: mapped(), tokenTransfers: tokenTransferRows(20), counts: {tokenTransfers: 64}}, {tab: 'tokens', hide: 'risky'}),
    play: async ({canvas, canvasElement}) => {
        expect(params(canvas.getByRole('link', {name: 'Hide risky txns'}))).toEqual({tab: 'tokens'})
        const pages = [...canvasElement.querySelectorAll('[data-slot=pagination] a[href]')]
        expect(pages.length).toBeGreaterThan(0)
        for (const a of pages) expect(params(a)).toMatchObject({tab: 'tokens', hide: 'risky'})
    },
}

// one tx moving the account's tokens five times, newest log first like the whole list, 10,000 between 10,001 and 9,999
export const InOneTx: StoryObj = {
    ...story({account: mapped(), tokenTransfers: tokenTransfersInOneTx(HEAD - 9, [10_002, 10_001, 10_000, 9_999, 9_998])}, {tab: 'tokens'}),
    play: async ({canvas}) => {
        const table = canvas.getByRole('columnheader', {name: 'Amount'}).closest('table')!
        await expect(columnTexts(table, 'Amount')).toEqual(['10,002', '10,001', '10,000', '9,999', '9,998'])
    },
}
