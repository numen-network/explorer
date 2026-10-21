import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HOLDING, holdingRows, NOT_HELD} from '../../../../../mock/fixtures/accounts.js'
import {tokenLabels} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import AccountPage from './page'
import {wellKnown, story, mapped} from './page.stories.helpers'

export default {title: 'Pages/Account/Tokens', ...pageMeta(AccountPage), decorators: [wellKnown]}

export const One = story({account: mapped(), holdings: [HOLDING]}, {tab: 'holdings'})

// a token at a zero balance or with no answer to balanceOf is not listed
export const SkipNotHeld: StoryObj = {
    ...story({account: mapped(), holdings: [HOLDING], notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual(['Wrapped Tumor']),
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
