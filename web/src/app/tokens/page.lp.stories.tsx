import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {NUMN, pair, token} from '../../../../mock/fixtures/evm.js'
import {pageMeta} from '../../../.storybook/page'
import TokensPage from './page'
import {list} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Tokens/LP', ...pageMeta(TokensPage)}

// what each row's pair badge reads, null for a token that pools nothing
const badges = (root: HTMLElement) => [...root.querySelectorAll('tbody tr')].map(row => row.querySelector('[data-variant]')?.textContent ?? null)

const TEST = token(2).id
const NDEX = token(3).id

// a pair names the two tokens it pools in the order it keeps them, and one that
// answers no symbol shows by its address
export const PairBadges: StoryObj = {
    ...list([pair(10, NUMN, {address: TEST, symbol: 'TEST', decimals: 18}), pair(11, {address: NDEX, symbol: 'NDEX', decimals: 18}, {address: TEST, symbol: 'TEST', decimals: 18}), pair(12, NUMN, {address: NDEX, symbol: null, decimals: 18})], 5, 3, 'lp'),
    play: async ({canvas, canvasElement}) => {
        await expect(within(canvas.getByRole('navigation', {name: 'Tokens'})).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^LP/)
        await expect(badges(canvasElement)).toEqual(['LP NUMN/TEST', 'LP NDEX/TEST', `LP NUMN/${shortHash(NDEX)}`])
    },
}

export const Empty: StoryObj = {...list([], 5, 0, 'lp'), play: async ({canvas}) => expect(canvas.getByText('No tokens seen yet.')).toBeVisible()}
