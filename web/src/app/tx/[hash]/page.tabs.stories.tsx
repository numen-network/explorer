import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import EvmTxPage from './page'
import {txPage, swap, wrap, payout, swapLogs, call} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction/Tabs', ...pageMeta(EvmTxPage)}

const nav = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Transaction'}))

// a swap moves the native coin and tokens and logs each step, so every tab shows.
// the page opens on Native transfers
export const EveryTab: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}),
    play: async ({canvasElement}) => {
        expect(nav(canvasElement).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Native transfers/)
        expect(['native', 'transfers', 'logs'].map(slug => tabCount(canvasElement, slug))).toEqual(['2', '2', '5'])
    },
}

// a call that moves neither the native coin nor a token shows Logs alone
export const LogsOnly: StoryObj = {
    ...txPage(call),
    play: async ({canvasElement}) => expect(nav(canvasElement).getAllByRole('link').map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'), a.getAttribute('aria-current')])).toEqual([['logs', 'page']]),
}
