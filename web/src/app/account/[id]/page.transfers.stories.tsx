import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {accountTransferCases, accountTransfers, subject} from '../../../../../mock/fixtures/accounts.js'
import {HEAD} from '../../../../../mock/fixtures.js'
import {filterChips} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story} from './page.stories.helpers'

export default {title: 'Pages/Account/Transfers | Native', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const Empty: StoryObj = {
    ...story({account: subject({nonce: 0, firstSeenBlock: 0, firstSeenTimestamp: null, lastActiveBlock: 0})}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No transfers yet.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Direction')).toEqual(['[All]', 'Out', 'In'])
    },
}

export const One = story({transfers: accountTransfers(1)})

export const Many = story({transfers: [...accountTransfers(14), ...accountTransferCases(HEAD - 100)], counts: {transfers: 137}})

export const Out = story({transfers: accountTransfers(20, 'from'), counts: {transfers: 137, from: 46}}, {tab: 'transfers', dir: 'out'})

export const In = story({transfers: accountTransfers(20, 'to'), counts: {transfers: 137, to: 91}}, {tab: 'transfers', dir: 'in'})

export const FilteredEmpty: StoryObj = {
    ...story({transfers: accountTransfers(3, 'to')}, {tab: 'transfers', dir: 'out'}),
    play: async ({canvas, canvasElement}) => {
        await expect(canvas.getByText('No matching transfers.')).toBeInTheDocument()
        expect(filterChips(canvasElement, 'Direction')).toEqual(['All', '[Out]', 'In'])
    },
}
