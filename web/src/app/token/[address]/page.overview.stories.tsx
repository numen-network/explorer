import type {StoryObj} from '@storybook/nextjs-vite'
import {expect, within} from 'storybook/test'
import {shortHash} from '@/lib/format'
import type {TokenRow} from '@/lib/gql'
import {evmAddress, holder, holders, proxy} from '../../../../../mock/fixtures/evm.js'
import {cardsFit, expectFits} from '../../../../.storybook/fit'
import {pageMeta} from '../../../../.storybook/page'
import TokenPage from './page'
import {tokenPage, orbit, bare} from './page.stories.helpers'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token/Overview', ...pageMeta(TokenPage)}

// what a tile reads under its figure, chip by chip
const chips = (canvas: HTMLElement, label: string) => [...within(canvas).getByText(label, {selector: '[data-slot=card-description]'}).closest('[data-slot=card]')!.querySelectorAll('[data-slot=card-content] > span')].map(c => c.textContent)

// the create tx names who deployed the token and where
export const Deployed: StoryObj = {
    ...tokenPage(orbit, {holders: holders(orbit, 5)}),
    play: async ({canvasElement}) => expect(chips(canvasElement, 'Deployed at')).toEqual([`${shortHash(orbit.deployTx!.from)} · creator`, `${shortHash(orbit.deployTx!.id)} · tx`]),
}

// a factory built token or one older than the index has no create tx, only the block it first moved in
export const NoDeployTx: StoryObj = {
    ...tokenPage({...orbit, deployTx: null}, {holders: holders(orbit, 5)}),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.queryByText('Deployed at')).toBeNull()
        expect(chips(canvasElement, 'First seen')).toEqual([])
    },
}

const proxied = (kind: string, ...implementations: string[]) => tokenPage({...orbit, ...proxy(kind, ...implementations)}, {holders: holders(orbit, 5)})

export const ProxyUpgradeable: StoryObj = {
    ...proxied('Eip1967Direct', evmAddress(40)),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByRole('heading', {level: 1}).querySelector('[data-slot=badge]')).toHaveTextContent('Proxy')
        expect(canvas.getByText(shortHash(evmAddress(40)))).toBeVisible()
        expect(chips(canvasElement, 'Implementation')).toEqual(['EIP-1967 · upgradeable'])
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}

export const ProxyFixed: StoryObj = {
    ...proxied('Eip1167', evmAddress(41)),
    play: async ({canvasElement}) => expect(chips(canvasElement, 'Implementation')).toEqual(['EIP-1167 · fixed']),
}

// a diamond delegates to one facet per group of functions
export const ProxyDiamond: StoryObj = {
    ...proxied('Eip2535Diamond', evmAddress(42), evmAddress(43), evmAddress(44)),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByText('3 facets')).toBeVisible()
        expect(chips(canvasElement, 'Implementation')).toEqual(['EIP-2535 · upgradeable'])
    },
}

// a kind with no EIP number shows under the name the detector gives it
export const ProxyNamedKind: StoryObj = {
    ...proxied('OpenZeppelin', evmAddress(45)),
    play: async ({canvasElement}) => expect(chips(canvasElement, 'Implementation')).toEqual(['OpenZeppelin · upgradeable']),
}

export const NoMetadata = {...tokenPage(bare, {holders: holders(bare, 5)}), play: cardsFit}

// the mainnet DEX LP token, its whole supply a few billion of its smallest unit
const nlp: TokenRow = {
    id: '0xacc96782e7336a38d066687f2bb6247fe854adad',
    name: 'Numen DEX LP',
    symbol: 'NLP',
    decimals: 18,
    totalSupply: '3162277660',
    holderCount: 2,
    transferCount: 2,
    deployTx: null,
    firstBlock: 109_457,
    token0: '0x0000000000000000000000000000000000000802',
    token1: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9',
    token0Symbol: 'NUMN',
    token1Symbol: 'wWTMR',
    token0Decimals: 18,
    token1Decimals: 1,
    reserve0: '1000000000000000000',
    reserve1: '10',
    proxyType: null,
    implementations: null,
}

export const DustSupply: StoryObj = {
    ...tokenPage(nlp, {
        holders: [holder(nlp, '0x0db8300836bd652c361c4158a8e69167cf33571f', '3162276660'), holder(nlp, '0x0000000000000000000000000000000000000001', '1000')],
    }),
    play: async ({canvas}) => {
        expect(canvas.getByText('Total supply').closest('[data-slot=card]')!.querySelector('[data-slot=card-title]')).toHaveTextContent('≈0 NLP')
        expect(within(canvas.getByRole('heading', {level: 1})).getByText('LP NUMN/wWTMR')).toBeVisible()
    },
}
