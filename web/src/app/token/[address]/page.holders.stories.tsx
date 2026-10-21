import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {fmtInt} from '@/lib/format'
import {HEAD} from '../../../../../mock/fixtures.js'
import {activity, evmAddress, holder, holders, token, UINT256_MAX, WTMR} from '../../../../../mock/fixtures/evm.js'
import {columnTexts, expectAddressForm, expectFits} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import TokenPage from './page'
import {tokenPage, orbit, solo} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token/Holders', ...pageMeta(TokenPage)}

const burnt = token(5, {totalSupply: '0', holderCount: 0, transferCount: 2})
const huge = token(3, {
    name: 'A token name long enough to wrap the heading on a phone',
    symbol: 'LONGSYMBOLTOKEN',
    decimals: 18,
    totalSupply: UINT256_MAX,
    holderCount: 2_147_483_647,
    transferCount: 2_147_483_647,
})

export const Many: StoryObj = {
    ...tokenPage(WTMR, {holders: holders(WTMR, 20)}),
    play: async ({canvas, canvasElement}) => {
        expect(canvasElement.querySelector('h1 [data-slot=badge]')).toBeNull()
        expect(within(canvas.getByRole('heading', {level: 1})).queryByText(/^LP /)).toBeNull()
        expectAddressForm(canvasElement.querySelector('[data-slot=table-container]')!)
        const tallies = holders(WTMR, 20).map((h, i) => activity(h.address, i))
        expect(columnTexts(canvasElement, 'Transactions')).toEqual(tallies.map(a => fmtInt(a.txCount)))
        expect(columnTexts(canvasElement, 'First seen')).toEqual(tallies.map(a => `#${fmtInt(a.firstSeenBlock)}`))
        expect(columnTexts(canvasElement, 'Last active')).toEqual(tallies.map(a => `#${fmtInt(a.lastActiveBlock)}`))
    },
}

export const PageThree = tokenPage(WTMR, {holders: holders(WTMR, 20, 40)}, {page: '3'})

export const One = tokenPage(solo, {holders: [holder(solo, evmAddress(0), solo.totalSupply)]})

export const Empty = tokenPage(burnt)

// what each holder reads in the Share column, in table order
const shares = (root: HTMLElement) => columnTexts(root, 'Share')

// a share of a supply nobody read has no figure
export const SupplyUnknown: StoryObj = {
    ...tokenPage({...orbit, totalSupply: null, holderCount: 5}, {holders: holders(orbit, 5)}),
    play: async ({canvasElement}) => expect(shares(canvasElement)).toEqual(Array(5).fill('—')),
}

// a holder just short of half the largest supply with as many transactions as
// the index can count, and one holding its smallest unit that never sent one
export const ExtremeNumbers: StoryObj = {
    ...tokenPage(huge, {
        holders: [holder(huge, evmAddress(0), (BigInt(UINT256_MAX) / 2n).toString()), holder(huge, evmAddress(1), '1')],
        tallies: [{id: evmAddress(0), txCount: 2_147_483_647, firstSeenBlock: 0, lastActiveBlock: HEAD}, {...activity(evmAddress(1), 1), lastActiveBlock: null}],
    }),
    play: async ({canvasElement}) => {
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
        await expect(shares(canvasElement)).toEqual(['49.99%', '<0.01%'])
        await expect(columnTexts(canvasElement, 'Transactions')).toEqual(['2,147,483,647', '37'])
        expect(columnTexts(canvasElement, 'Last active')).toEqual([`#${fmtInt(HEAD)}`, ''])
    },
}
