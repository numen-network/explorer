import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {token, UINT256_MAX, units, WTMR} from '../../../../mock/fixtures/evm.js'
import {columnTexts} from '../../../.storybook/fit'
import {pageMeta} from '../../../.storybook/page'
import TokensPage from './page'
import {list, counts} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Tokens/Tokens', ...pageMeta(TokensPage)}

export const Empty = list([])

export const One: StoryObj = {...list([WTMR]), play: counts('1', '0')}

export const Many: StoryObj = {...list([WTMR, ...Array.from({length: 19}, (_, n) => token(n))], 87, 4), play: counts('87', '4')}

export const LogoKnownAndFallback = list([WTMR, token(0)])

export const MetadataMissing = list([
    token(1, {name: null}),
    token(2, {symbol: null}),
    token(3, {decimals: null}),
    token(4, {totalSupply: null}),
    token(5, {deployTx: null}),
    token(6, {name: null, symbol: null, decimals: null, totalSupply: null, deployTx: null}),
])

export const ExtremeNumbers: StoryObj = {
    ...list(
        [
            token(0, {name: 'A token name long enough to push every other column of the row', symbol: 'LONGSYMBOLTOKEN', totalSupply: UINT256_MAX, decimals: 18, holderCount: 2_147_483_647, transferCount: 2_147_483_647}),
            token(1, {totalSupply: UINT256_MAX, decimals: 0}),
            token(2, {totalSupply: '1', decimals: 18}),
            token(3, {totalSupply: units(123_456_789.123456, 12)}),
            token(4, {totalSupply: '0', holderCount: 0, transferCount: 1}),
        ],
        1_234_567,
        42
    ),
    play: counts('1,234,567', '42'),
}

// a supply that ends within two decimals reads as it is, a cut one carries ≈
// and a few billion of the smallest unit of an 18 decimal token is ≈0
export const SupplyShortForms: StoryObj = {
    ...list([token(5), token(0, {totalSupply: units(52_513_000, 6)}), token(9, {name: 'Numen DEX LP', symbol: 'NLP', decimals: 18, totalSupply: '3162277660'})]),
    play: async ({canvas}) => expect(columnTexts(canvas.getByRole('table'), 'Total supply')).toEqual(['21M ORE', '≈52.51M oUSD', '≈0 NLP']),
}
