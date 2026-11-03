import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {evmTx, holding, NOT_HELD, token, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {tabCount} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import EvmAddressPage from './page'
import {addressPage, alice, contract, deploy, everyTx} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address/Tabs', ...pageMeta(EvmAddressPage)}

const TXS = [evmTx(999_990, 0, everyTx[0])]
const nav = (root: HTMLElement) => within(within(root).getByRole('navigation', {name: 'Address'}))

// a contract holding tokens shows every tab and opens on Transactions. Contract has no count
export const EveryTab: StoryObj = {
    ...addressPage(contract, {txs: [deploy], created: [deploy], holdings: [holding(WTMR, units(1_234.5, 1))]}),
    play: async ({canvasElement}) => {
        expect(nav(canvasElement).getAllByRole('link').map(a => [new URL(a.getAttribute('href')!, 'http://x').searchParams.get('tab'), a.querySelector('[data-slot=badge]')?.textContent ?? null, a.getAttribute('aria-current')])).toEqual([
            ['txs', '1', 'page'],
            ['holdings', '1', null],
            ['contract', null, null],
        ])
    },
}

// a token at a zero balance or with no answer to balanceOf goes uncounted
export const EoaTokensCountSkipsNotHeld: StoryObj = {
    ...addressPage(alice, {txs: TXS, holdings: [holding(token(1), units(5_000_000, 18)), holding(WTMR, units(1_234.5, 1))], notHeld: NOT_HELD}),
    play: async ({canvasElement}) => expect(tabCount(canvasElement, 'holdings')).toBe('2'),
}

// with nothing held there is no tokens tab, and a link to it opens the first tab
export const EoaNoTokensTab: StoryObj = {
    ...addressPage(alice, {txs: TXS, notHeld: NOT_HELD}, {tab: 'holdings'}),
    play: async ({canvasElement}) => {
        expect(tabCount(canvasElement, 'holdings')).toBeNull()
        expect(nav(canvasElement).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Transactions/)
    },
}

// an account has no contract tab, so a link to one opens the first tab
export const EoaNoContractTab: StoryObj = {
    ...addressPage(alice, {txs: TXS}, {tab: 'contract'}),
    play: async ({canvasElement}) => {
        expect(nav(canvasElement).queryByRole('link', {name: /^Contract/})).toBeNull()
        expect(nav(canvasElement).getByRole('link', {current: 'page'})).toHaveAccessibleName(/^Transactions/)
    },
}
