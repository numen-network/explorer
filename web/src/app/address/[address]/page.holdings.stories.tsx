import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {EVERY_HOLDING, evmTx, holding, holdings, NOT_HELD, token, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {tokenLabels} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import EvmAddressPage from './page'
import {addressPage, alice, everyTx} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address/Tokens', ...pageMeta(EvmAddressPage)}

const HOLDINGS_TAB = {tab: 'holdings'}

export const EoaEveryCase: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: EVERY_HOLDING}, HOLDINGS_TAB),
    play: async ({canvasElement}) =>
        expect(tokenLabels(canvasElement)).toEqual([
            'A token name long enough to crowd its balance off a phone screen',
            'Comet Points',
            'Kuiper Belt Dust',
            'Nova Fund Share',
            'NumenDEX LP Token',
            'Orbit Dollar',
            'Polaris Governance',
            'Spectral Shard',
            'Wrapped WTMR',
            shortHash(token(2).id),
        ]),
}

export const EoaOne = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: [holding(WTMR, units(1_234.5, 1))]}, HOLDINGS_TAB)

// a token at a zero balance or with no answer to balanceOf stays out of the list
export const EoaSkipNotHeld: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: [holding(token(1), units(5_000_000, 18)), holding(WTMR, units(1_234.5, 1))], notHeld: NOT_HELD}, HOLDINGS_TAB),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual(['Polaris Governance', 'Wrapped WTMR']),
}

const manyHoldings = holdings(50)

// fifty holdings share ten token names, five rows to a name
const fiveEach = (...names: string[]) => names.flatMap(name => Array(5).fill(name))

export const EoaMany: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, HOLDINGS_TAB),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual(fiveEach('Asteroid Ore', 'Comet Points', 'Kuiper Belt Dust', 'Lunar Bond')),
}

export const EoaPage2 = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, {...HOLDINGS_TAB, page: '2'})

export const EoaLastPage = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, {...HOLDINGS_TAB, page: lastPage(manyHoldings.length)})
