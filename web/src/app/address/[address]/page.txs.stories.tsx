import type {StoryObj} from '@storybook/nextjs-vite'
import {rows} from '../../../../../mock/fixtures.js'
import {evmAddress, evmTx, units} from '../../../../../mock/fixtures/evm.js'
import {expectShortHashes} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import EvmAddressPage from './page'
import {addressPage, alice, bob, everyTx} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address/Transactions', ...pageMeta(EvmAddressPage)}

export const EoaEmpty = addressPage(alice)

export const EoaOne = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])]})

export const EoaEveryCase = addressPage(alice, {txs: rows(everyTx.length, (h: number, i: number) => evmTx(h, 0, everyTx[i]))})

const manyTxs = rows(63, (h: number, i: number) => evmTx(h, i % 3, i % 2 ? {from: bob, to: alice, value: units(i * 1.5, 18)} : {from: alice, to: evmAddress(2 + (i % 5)), value: units(i, 18)}))

export const EoaMany: StoryObj = {
    ...addressPage(alice, {txs: manyTxs}),
    play: async ({canvasElement}) => expectShortHashes(...[...canvasElement.querySelectorAll('a[href^="/tx/"]')].map(link => link.textContent!)),
}

export const EoaPage2 = addressPage(alice, {txs: manyTxs}, {page: '2'})

export const EoaLastPage = addressPage(alice, {txs: manyTxs}, {page: lastPage(manyTxs.length)})
