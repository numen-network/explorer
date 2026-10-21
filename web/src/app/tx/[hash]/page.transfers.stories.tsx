import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortHash} from '@/lib/format'
import {HEAD} from '../../../../../mock/fixtures.js'
import {calldata, erc20Transfer, evmAddress, evmTx, exit, EXIT, SELECTOR, token, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {poisonedRows, tokenLabels} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, alice, bob, wrapped, ore, swap, wrap, payout, swapLogs, drops, airdropPage, crowdedPage} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Token transfers', ...pageMeta(EvmTxPage)}

const bare = token(3, {name: null, symbol: null, decimals: null})
const bareSent = units(77, 12)
const bareCall = evmTx(HEAD - 45, 0, {from: alice, to: bare.id, input: calldata(SELECTOR.transfer, bob, bareSent), gasLimit: '65000', gasUsed: '48000', ...exit(EXIT.returned)})
const bareTransfer = erc20Transfer(bareCall, 0, bare, alice, bob, bareSent)

export const TokenWithoutMetadata = txPage(bareCall, {logs: [bareTransfer.log], transfers: [bareTransfer.transfer]})

// a stranger moving nothing from the victim to a look-alike of an address it paid
const lookalike = evmAddress(70)
const poison = evmTx(HEAD - 70, 0, {from: evmAddress(71), to: WTMR.id, input: calldata(SELECTOR.transferFrom, alice, lookalike, 0), gasLimit: '60000', gasUsed: '31000', ...exit(EXIT.returned)})
const poisonTransfer = erc20Transfer(poison, 0, WTMR, alice, lookalike, '0')

const rows = (root: HTMLElement) => [...root.querySelectorAll('[data-slot=card] .divide-y > *')]

export const Poisoning: StoryObj = {
    ...txPage(poison, {logs: [poisonTransfer.log], transfers: [poisonTransfer.transfer]}, {tab: 'transfers'}),
    play: async ({canvasElement}) => expect(poisonedRows(rows(canvasElement))).toEqual([true]),
}

// a stranger moving a real amount between two other accounts is no poisoning
const approved = evmTx(HEAD - 75, 0, {from: evmAddress(72), to: WTMR.id, input: calldata(SELECTOR.transferFrom, alice, bob, units(25, WTMR.decimals)), gasLimit: '60000', gasUsed: '31000', ...exit(EXIT.returned)})
const approvedTransfer = erc20Transfer(approved, 0, WTMR, alice, bob, units(25, WTMR.decimals))

export const ThirdPartyRealAmount: StoryObj = {
    ...txPage(approved, {logs: [approvedTransfer.log], transfers: [approvedTransfer.transfer]}, {tab: 'transfers'}),
    play: async ({canvasElement}) => expect(poisonedRows(rows(canvasElement))).toEqual([false]),
}

// in log order, the wrap ahead of the payout
export const Swap: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}, {tab: 'transfers'}),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual([shortHash(wrapped.id), shortHash(ore.id)]),
}

export const Airdrop = airdropPage('transfers')

export const AirdropPage2 = airdropPage('transfers', '2')

export const AirdropLastPage = airdropPage('transfers', lastPage(drops.length))

// in log order, 10,000 right after 9,999
export const CrowdedBlock: StoryObj = {
    ...crowdedPage('transfers'),
    play: async ({canvas}) =>
        expect(canvas.getAllByText(/^[\d,]+ wWTMR$/).map(amount => amount.textContent)).toEqual(['9,997 wWTMR', '9,998 wWTMR', '9,999 wWTMR', '10,000 wWTMR', '10,001 wWTMR', '10,002 wWTMR']),
}
