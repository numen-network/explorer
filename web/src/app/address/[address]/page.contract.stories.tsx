import type {StoryObj} from '@storybook/nextjs-vite'
import type {RequestHandler} from 'msw'
import {expect, within} from 'storybook/test'
import {evmTx} from '../../../../../mock/fixtures/evm.js'
import {LONG, NOT_VERIFIED, NST, NST_PARTIAL, PROXIED, UNSUPPORTED_CHAIN, VAULT, VAULT_FILES, VYPER} from '../../../../../mock/fixtures/sourcify.js'
import {expectFits} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import {sourcify, sourcifyDown} from '../../../../.storybook/sourcify'
import EvmAddressPage from './page'
import {addressPage, alice, everyTx, contract, deploy, factoryBuilt} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address/Contract', ...pageMeta(EvmAddressPage)}

const CONTRACT_TAB = {tab: 'contract'}

// the deployed contract's Contract tab, with answer standing in for Sourcify
const contractTab = (answer: RequestHandler, {address = contract, created = [deploy], asToken = null}: {address?: string; created?: object[]; asToken?: object | null} = {}) =>
    addressPage(address, {txs: created, created, asToken}, CONTRACT_TAB, [answer])

const rowValue = (root: HTMLElement, label: string) => within(root).getByText(label, {selector: 'div'}).nextElementSibling!.textContent
const codeBoxes = (root: Element) => [...root.querySelectorAll<HTMLElement>('.source-code')]
const codeTitles = (root: Element) => codeBoxes(root).map(box => box.previousElementSibling!.firstElementChild!.textContent)
const codeLines = (root: Element) => codeBoxes(root).map(box => box.querySelectorAll('.line').length)

export const Verified: StoryObj = {
    ...contractTab(sourcify({body: NST})),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Status')).toBe('Exact match')
        expect(rowValue(canvasElement, 'Compiler')).toBe('solc 0.8.24+commit.e11b9ed9')
        expect(rowValue(canvasElement, 'Optimizer')).toBe('200 runs')
        expect(rowValue(canvasElement, 'EVM version')).toBe('cancun')
        expect(rowValue(canvasElement, 'Contract')).toBe('project/contracts/Token.sol:Token')
        expect(rowValue(canvasElement, 'Creation code')).toBe('2,048 bytes')
        expect(codeTitles(canvasElement)).toEqual(['project/contracts/Token.sol', 'ABI'])
        // the file's closing newline gets no line number of its own
        expect(codeLines(canvasElement)[0]).toBe(56)
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

export const PartialMatch: StoryObj = {
    ...contractTab(sourcify({body: NST_PARTIAL})),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Status')).toBe('Match')
        expect(codeTitles(canvasElement)).toEqual(['project/contracts/Token.sol'])
    },
}

export const ManyFiles: StoryObj = {
    ...contractTab(sourcify({body: VAULT})),
    play: async ({canvasElement}) => {
        expect(codeTitles(canvasElement)).toEqual(VAULT_FILES)
        expect(rowValue(canvasElement, 'Optimizer')).toBe('Off')
        expect(rowValue(canvasElement, 'EVM version')).toBe('—')
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

export const Proxy: StoryObj = {
    ...contractTab(sourcify({body: PROXIED})),
    play: async ({canvas}) => {
        const row = canvas.getByText('Implementation', {selector: 'div'}).nextElementSibling!
        expect(row.querySelector('a')).toHaveAttribute('href', '/address/0x5fbdb2315678afecb367f032d93f642f64180aa3')
        expect(row).toHaveTextContent('EIP1967Proxy')
    },
}

export const Vyper: StoryObj = {
    ...contractTab(sourcify({body: VYPER})),
    play: async ({canvasElement}) => {
        expect(rowValue(canvasElement, 'Compiler')).toBe('vyper 0.4.0+commit.e9db8d9f')
        expect(rowValue(canvasElement, 'Optimizer')).toBe('—')
        expect(codeTitles(canvasElement)).toEqual(['contracts/token.vy', 'ABI'])
    },
}

export const LongSource: StoryObj = {
    ...contractTab(sourcify({body: LONG})),
    play: async ({canvasElement}) => {
        const [box] = codeBoxes(canvasElement)
        expect(codeLines(canvasElement)[0]).toBe(1_344)
        expect(box.style.getPropertyValue('--digits')).toBe('4')
        expect(box.scrollHeight).toBeGreaterThan(box.clientHeight)
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

export const Unverified: StoryObj = {
    ...contractTab(sourcify({status: 404, body: NOT_VERIFIED})),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByText('Not verified')).toBeVisible()
        expect(canvas.getByRole('link', {name: /How to verify/})).toHaveAttribute('href', 'https://docs.sourcify.dev/docs/how-to-verify/')
        expect(rowValue(canvasElement, 'Creation code')).toBe('2,048 bytes')
        expect(codeBoxes(canvasElement)).toEqual([])
    },
}

// a factory built it, so the index holds no create tx to show
export const UnverifiedFactoryBuilt: StoryObj = {
    ...contractTab(sourcify({status: 404, body: NOT_VERIFIED}), {address: factoryBuilt.id, created: [], asToken: factoryBuilt}),
    play: async ({canvas}) => {
        expect(canvas.getByText('Not verified')).toBeVisible()
        expect(canvas.queryByText('Creation tx')).toBeNull()
    },
}

export const ChainUnsupported: StoryObj = {
    ...contractTab(sourcify({status: 400, body: UNSUPPORTED_CHAIN})),
    play: async ({canvas}) => {
        expect(canvas.getByText('Unavailable')).toBeVisible()
        expect(canvas.getByText('Chain 32026 not found')).toBeVisible()
    },
}

export const SourcifyDown: StoryObj = {
    ...contractTab(sourcifyDown),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByText('Unavailable')).toBeVisible()
        expect(rowValue(canvasElement, 'Creation code')).toBe('2,048 bytes')
    },
}

// an account has no contract tab, so a link to one opens the first tab
export const EoaNoTab: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])]}, CONTRACT_TAB),
    play: async ({canvas}) => {
        expect(canvas.queryByRole('tab', {name: /^Contract/})).toBeNull()
        expect(canvas.getByRole('tab', {selected: true})).toHaveAccessibleName(/^Transactions/)
    },
}
