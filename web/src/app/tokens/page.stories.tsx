import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortAddr} from '@/components/AddressText'
import {NUMN, pair, token, UINT256_MAX, units, WTMR} from '../../../../mock/fixtures/evm.js'
import {columnTexts} from '../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../.storybook/page'
import TokensPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Tokens', ...pageMeta(TokensPage)}

const list = (rows: object[], total = rows.length) => pageStory({tokens: rows, tokensConnection: {totalCount: total}})

const counts = (text: string): StoryObj['play'] => async ({canvas}) => expect(canvas.getByText(text)).toBeVisible()

export const Empty = list([])

export const One: StoryObj = {...list([WTMR]), play: counts('1 contract')}

export const Many: StoryObj = {...list([WTMR, ...Array.from({length: 19}, (_, n) => token(n))], 87), play: counts('87 contracts')}

// what each row's pair badge reads, null for a token that pools nothing
const badges = (root: HTMLElement) => [...root.querySelectorAll('tbody tr')].map(row => row.querySelector('[data-slot=badge]')?.textContent ?? null)

const TEST = token(2).id
const NDEX = token(3).id

// a pair names the two tokens it pools in the order it keeps them, and one that
// answers no symbol shows by its address
export const Pairs: StoryObj = {
    ...list([WTMR, pair(10, NUMN, {address: TEST, symbol: 'TEST'}), pair(11, {address: NDEX, symbol: 'NDEX'}, {address: TEST, symbol: 'TEST'}), pair(12, NUMN, {address: NDEX, symbol: null})]),
    play: async ({canvasElement}) => expect(badges(canvasElement)).toEqual([null, 'LP NUMN/TEST', 'LP NDEX/TEST', `LP NUMN/${shortAddr(NDEX)}`]),
}

export const LogoKnownAndFallback = list([WTMR, token(0)])

export const MetadataMissing = list([
    token(1, {name: null}),
    token(2, {symbol: null}),
    token(3, {decimals: null}),
    token(4, {totalSupply: null}),
    token(5, {deployBlock: null}),
    token(6, {name: null, symbol: null, decimals: null, totalSupply: null, deployBlock: null}),
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
        1_234_567
    ),
    play: counts('1,234,567 contracts'),
}

// a supply that ends within two decimals reads as it is, a cut one carries ≈
// and a few billion of the smallest unit of an 18 decimal token is ≈0
export const SupplyShortForms: StoryObj = {
    ...list([token(5), token(0, {totalSupply: units(52_513_000, 6)}), token(9, {name: 'Numen DEX LP', symbol: 'NLP', decimals: 18, totalSupply: '3162277660'})]),
    play: async ({canvas}) => expect(columnTexts(canvas.getByRole('table'), 'Total supply')).toEqual(['21M ORE', '≈52.51M oUSD', '≈0 NLP']),
}
