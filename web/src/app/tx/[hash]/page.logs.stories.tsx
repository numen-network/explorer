import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {expectAddressForm, expectFits, tabPanel} from '../../../../.storybook/fit'
import {lastPage, pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, call, callTransfer, plain, swap, wrap, payout, swapLogs, drops, airdropPage, crowdedPage} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Logs', ...pageMeta(EvmTxPage)}

const LOGS_TAB = {tab: 'logs'}

export const One = txPage(call, {logs: [callTransfer.log], transfers: [callTransfer.transfer]}, LOGS_TAB)

export const Empty = txPage(plain, {}, LOGS_TAB)

// every log address keeps its full form and wraps inside its row
export const Swap: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}, LOGS_TAB),
    play: async ({canvasElement}) => {
        const logs = tabPanel(canvasElement, 'Transaction')
        expectAddressForm(logs)
        expectFits(...[...logs.querySelectorAll('a[href^="/address/"]')].map(link => link.closest('[data-slot=card] > *')!))
    },
}

export const Airdrop = airdropPage('logs')

export const AirdropPage2 = airdropPage('logs', '2')

export const AirdropLastPage = airdropPage('logs', lastPage(drops.length))

export const CrowdedBlock: StoryObj = {
    ...crowdedPage('logs'),
    play: async ({canvas}) => expect(canvas.getAllByText(/^#\d+$/).map(n => n.textContent)).toEqual(['#9997', '#9998', '#9999', '#10000', '#10001', '#10002']),
}
