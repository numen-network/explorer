import type {TokenRow} from '@/lib/gql'
import {rows} from '../../../../../mock/fixtures.js'
import {evmAddress, holder, holders, token, tokenTransfer, UINT256_MAX, units, WTMR, ZERO_ADDRESS} from '../../../../../mock/fixtures/evm.js'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import TokenPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token', ...pageMeta(TokenPage)}

const tokenPage = (tok: TokenRow, {holders = [], transfers = []}: {holders?: object[]; transfers?: object[]} = {}, searchParams = {}) =>
    pageStory({tokenById: tok, tokenHolders: holders, tokenTransfers: transfers}, {params: {address: tok.id}, searchParams})

const TRANSFERS_TAB = {tab: 'transfers'}

const orbit = token(0)
const solo = token(2, {holderCount: 1, transferCount: 1})
const burnt = token(5, {totalSupply: '0', holderCount: 0, transferCount: 2})
const fresh = token(7, {totalSupply: null, holderCount: 0, transferCount: 0})
const bare = token(1, {name: null, symbol: null, decimals: null})
const huge = token(3, {
    name: 'A token name long enough to wrap the heading on a phone',
    symbol: 'LONGSYMBOLTOKEN',
    decimals: 18,
    totalSupply: UINT256_MAX,
    holderCount: 2_147_483_647,
    transferCount: 2_147_483_647,
})

export const HoldersMany = tokenPage(WTMR, {holders: holders(WTMR, 20)})

export const HoldersPageThree = tokenPage(WTMR, {holders: holders(WTMR, 20, 40)}, {page: '3'})

export const HoldersOne = tokenPage(solo, {holders: [holder(solo, evmAddress(0), solo.totalSupply)]})

export const HoldersEmpty = tokenPage(burnt)

export const SupplyUnknown = tokenPage({...orbit, totalSupply: null, holderCount: 5}, {holders: holders(orbit, 5)})

export const NoDeployBlock = tokenPage({...orbit, deployBlock: null}, {holders: holders(orbit, 5)})

export const NoMetadata = tokenPage(bare, {holders: holders(bare, 5)})

export const NoMetadataTransfers = tokenPage(bare, {transfers: rows(5, (h: number, i: number) => tokenTransfer(token(1), h, i, {token: bare}))}, TRANSFERS_TAB)

export const ExtremeNumbers = tokenPage(huge, {holders: [holder(huge, evmAddress(0), (BigInt(UINT256_MAX) / 2n).toString()), holder(huge, evmAddress(1), '1')]})

export const TransfersMany = tokenPage(WTMR, {transfers: rows(20, (h: number, i: number) => tokenTransfer(WTMR, h, i))}, TRANSFERS_TAB)

// the oldest transfers sit on the last page and end with the mint at the token's first block
export const TransfersLastPage = tokenPage(
    WTMR,
    {transfers: Array.from({length: 11}, (_, i) => tokenTransfer(WTMR, WTMR.firstBlock + 70 - i * 7, i, i === 10 ? {from: ZERO_ADDRESS} : {}))},
    {...TRANSFERS_TAB, page: '2416'}
)

export const TransfersOne = tokenPage(solo, {transfers: [tokenTransfer(solo, 999_990, 0, {from: ZERO_ADDRESS, to: evmAddress(0), amount: solo.totalSupply})]}, TRANSFERS_TAB)

export const TransfersEmpty = tokenPage(fresh, {}, TRANSFERS_TAB)

export const TransfersEveryKind = tokenPage(
    WTMR,
    {
        transfers: rows(7, (h: number, i: number) =>
            tokenTransfer(WTMR, h, i, [
                {from: ZERO_ADDRESS, to: evmAddress(1), amount: units(500, 1)},
                {from: evmAddress(2), to: ZERO_ADDRESS, amount: units(120.5, 1)},
                {from: evmAddress(3), to: evmAddress(4), amount: units(42, 1)},
                {from: evmAddress(5), to: evmAddress(5), amount: units(7, 1)},
                {from: evmAddress(6), to: evmAddress(7), amount: '0'},
                {from: evmAddress(8), to: evmAddress(9), amount: '1'},
                {from: evmAddress(10), to: evmAddress(11), amount: UINT256_MAX},
            ][i])
        ),
    },
    TRANSFERS_TAB
)
