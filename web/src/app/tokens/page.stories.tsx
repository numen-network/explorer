import {token, UINT256_MAX, units, WTMR} from '../../../../mock/fixtures/evm.js'
import {pageMeta, pageStory} from '../../../.storybook/page'
import TokensPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Tokens', ...pageMeta(TokensPage)}

const list = (rows: object[], total = rows.length) => pageStory({tokens: rows, tokensConnection: {totalCount: total}})

export const Empty = list([])

export const One = list([WTMR])

export const Many = list([WTMR, ...Array.from({length: 19}, (_, n) => token(n))], 87)

export const LogoKnownAndFallback = list([WTMR, token(0)])

export const MetadataMissing = list([
    token(1, {name: null}),
    token(2, {symbol: null}),
    token(3, {decimals: null}),
    token(4, {totalSupply: null}),
    token(5, {deployBlock: null}),
    token(6, {name: null, symbol: null, decimals: null, totalSupply: null, deployBlock: null}),
])

export const ExtremeNumbers = list(
    [
        token(0, {name: 'A token name long enough to push every other column of the row', symbol: 'LONGSYMBOLTOKEN', totalSupply: UINT256_MAX, decimals: 18, holderCount: 2_147_483_647, transferCount: 2_147_483_647}),
        token(1, {totalSupply: UINT256_MAX, decimals: 0}),
        token(2, {totalSupply: '1', decimals: 18}),
        token(3, {totalSupply: units(123_456_789.123456, 12)}),
        token(4, {totalSupply: '0', holderCount: 0, transferCount: 1}),
    ],
    1_234_567
)
