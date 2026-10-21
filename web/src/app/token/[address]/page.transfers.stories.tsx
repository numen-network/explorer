import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {HEAD, rows} from '../../../../../mock/fixtures.js'
import {evmAddress, token, tokenTransfer, tokenTransfersInOneTx, UINT256_MAX, units, WTMR, ZERO_ADDRESS} from '../../../../../mock/fixtures/evm.js'
import {poisonedRows} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import TokenPage from './page'
import {tokenPage, solo, bare} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token/Transfers', ...pageMeta(TokenPage)}

const TRANSFERS_TAB = {tab: 'transfers'}

const fresh = token(7, {totalSupply: null, holderCount: 0, transferCount: 0})

export const NoMetadata = tokenPage(bare, {transfers: rows(5, (h: number, i: number) => tokenTransfer(token(1), h, i, {token: bare}))}, TRANSFERS_TAB)

export const Many = tokenPage(WTMR, {transfers: rows(20, (h: number, i: number) => tokenTransfer(WTMR, h, i))}, TRANSFERS_TAB)

// the oldest transfers sit on the last page and end with the mint at the token's first block
export const LastPage = tokenPage(
    WTMR,
    {transfers: Array.from({length: 11}, (_, i) => tokenTransfer(WTMR, WTMR.firstBlock + 70 - i * 7, i, i === 10 ? {from: ZERO_ADDRESS} : {}))},
    {...TRANSFERS_TAB, page: '2416'}
)

export const One = tokenPage(solo, {transfers: [tokenTransfer(solo, 999_990, 0, {from: ZERO_ADDRESS, to: evmAddress(0), amount: solo.totalSupply})]}, TRANSFERS_TAB)

export const Empty = tokenPage(fresh, {}, TRANSFERS_TAB)

// one tx moving the token five times, newest log first like the whole list, 10,000 between 10,001 and 9,999
export const InOneTx: StoryObj = {
    ...tokenPage(WTMR, {transfers: tokenTransfersInOneTx(WTMR, HEAD - 5, [10_002, 10_001, 10_000, 9_999, 9_998])}, TRANSFERS_TAB),
    play: async ({canvas}) =>
        expect(canvas.getAllByText(/^[\d,]+ wWTMR$/).map(amount => amount.textContent)).toEqual(['10,002 wWTMR', '10,001 wWTMR', '10,000 wWTMR', '9,999 wWTMR', '9,998 wWTMR']),
}

// the zero transfer neither side sent is marked as poisoning, the zero one a side sent is not
export const EveryKind: StoryObj = {
    ...tokenPage(
        WTMR,
        {
            transfers: rows(8, (h: number, i: number) =>
                tokenTransfer(WTMR, h, i, [
                    {from: ZERO_ADDRESS, to: evmAddress(1), amount: units(500, 1)},
                    {from: evmAddress(2), to: ZERO_ADDRESS, amount: units(120.5, 1)},
                    {from: evmAddress(3), to: evmAddress(4), amount: units(42, 1)},
                    {from: evmAddress(5), to: evmAddress(5), amount: units(7, 1)},
                    {from: evmAddress(6), to: evmAddress(7), amount: '0', thirdParty: true},
                    {from: evmAddress(12), to: evmAddress(13), amount: '0'},
                    {from: evmAddress(8), to: evmAddress(9), amount: '1'},
                    {from: evmAddress(10), to: evmAddress(11), amount: UINT256_MAX},
                ][i])
            ),
        },
        TRANSFERS_TAB
    ),
    play: async ({canvasElement}) => expect(poisonedRows([...canvasElement.querySelectorAll('[data-slot=card] .divide-y > *')])).toEqual([false, false, false, false, true, false, false, false]),
}
