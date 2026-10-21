import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {accountTransfers, HOLDING, holdingRows, NOT_HELD} from '../../../../../mock/fixtures/accounts.js'
import {expectNamedNavs, tabCount, tokenLabels} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, mapped} from './page.stories.helpers'

export default {title: 'Pages/Account/Tokens', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: mapped(), holdings: [HOLDING]}, {tab: 'holdings'})

// a token at a zero balance or with no answer to balanceOf is neither listed nor counted
export const SkipNotHeld: StoryObj = {
    ...story({account: mapped(), holdings: [HOLDING], notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => {
        expect(tokenLabels(canvasElement)).toEqual(['Wrapped Tumor'])
        expect(tabCount(canvasElement, 'holdings')).toBe('1')
    },
}

// with nothing held there is no tokens tab, and a link to it opens the first tab
export const NoneHeld: StoryObj = {
    ...story({account: mapped(), transfers: accountTransfers(2), notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvas, canvasElement}) => {
        expect(tabCount(canvasElement, 'holdings')).toBeNull()
        expectNamedNavs(canvasElement)
        expect(within(canvas.getByRole('navigation', {name: 'Account'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Transfers/)
        expect(within(canvas.getByRole('navigation', {name: 'Transfers'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Native/)
    },
}

export const Many: StoryObj = {
    ...story({account: mapped(), holdings: holdingRows(20), counts: {holdings: 33}}, {tab: 'holdings'}),
    play: async ({canvasElement}) =>
        expect(tokenLabels(canvasElement)).toEqual([
            'A token name long enough to crowd its balance off the row',
            'Orbit Credits',
            ...Array.from({length: 16}, (_, i) => `Token ${String(i + 1).padStart(2, '0')}`),
            'Wrapped Tumor',
            '0xe2e2…e2e2',
        ]),
}
