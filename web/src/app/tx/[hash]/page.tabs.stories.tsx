import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, swap, wrap, payout, swapLogs} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Tabs', ...pageMeta(EvmTxPage)}

// a swap moves the native coin and tokens and logs each step, so every tab shows
export const EveryTab: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}),
    play: async ({canvasElement}) => expect(['native', 'transfers', 'logs'].map(slug => tabCount(canvasElement, slug))).toEqual(['2', '2', '5']),
}
