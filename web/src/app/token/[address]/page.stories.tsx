import type {StoryObj} from '@storybook/nextjs-vite'
import type {RequestHandler} from 'msw'
import {expect, within} from 'storybook/test'
import {fmtInt, shortHash} from '@/lib/format'
import type {EvmActivity, TokenRow} from '@/lib/gql'
import {HEAD, rows} from '../../../../../mock/fixtures.js'
import {activity, bytecode, evmAddress, evmTx, exit, EXIT, holder, holders, proxy, token, tokenTransfer, tokenTransfersInOneTx, UINT256_MAX, units, WTMR, ZERO_ADDRESS} from '../../../../../mock/fixtures/evm.js'
import {NST} from '../../../../../mock/fixtures/sourcify.js'
import {cardsFit, columnTexts, expectAddressForm, expectFits, poisonedRows} from '../../../../.storybook/fit'
import {pageMeta, pageStory} from '../../../../.storybook/page'
import {sourcify} from '../../../../.storybook/sourcify'
import TokenPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/Token', ...pageMeta(TokenPage)}

// the index answers the activity lookup in an order of its own, so the tallies
// go in reversed and the page has to match them up by address
const tokenPage = (
    tok: TokenRow,
    {
        holders = [],
        transfers = [],
        tallies = holders.map((h, i) => activity(h.address, i)),
        created = [],
        msw = [],
    }: {holders?: {address: string}[]; transfers?: object[]; tallies?: EvmActivity[]; created?: object[]; msw?: RequestHandler[]} = {},
    searchParams = {}
) => pageStory({tokenById: tok, tokenHolders: holders, evmAddresses: [...tallies].reverse(), tokenTransfers: transfers, evmTransactions: created}, {params: {address: tok.id}, searchParams, msw})

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

export const HoldersMany: StoryObj = {
    ...tokenPage(WTMR, {holders: holders(WTMR, 20)}),
    play: async ({canvasElement}) => {
        expect(canvasElement.querySelector('h1 [data-slot=badge]')).toBeNull()
        expectAddressForm(canvasElement.querySelector('[data-slot=table-container]')!)
        const tallies = holders(WTMR, 20).map((h, i) => activity(h.address, i))
        expect(columnTexts(canvasElement, 'Transactions')).toEqual(tallies.map(a => fmtInt(a.txCount)))
        expect(columnTexts(canvasElement, 'First seen')).toEqual(tallies.map(a => `#${fmtInt(a.firstSeenBlock)}`))
        expect(columnTexts(canvasElement, 'Last active')).toEqual(tallies.map(a => `#${fmtInt(a.lastActiveBlock)}`))
    },
}

export const HoldersPageThree = tokenPage(WTMR, {holders: holders(WTMR, 20, 40)}, {page: '3'})

export const HoldersOne = tokenPage(solo, {holders: [holder(solo, evmAddress(0), solo.totalSupply)]})

export const HoldersEmpty = tokenPage(burnt)

// what each holder reads in the Share column, in table order
const shares = (root: HTMLElement) => columnTexts(root, 'Share')

// a share of a supply nobody read has no figure
export const SupplyUnknown: StoryObj = {
    ...tokenPage({...orbit, totalSupply: null, holderCount: 5}, {holders: holders(orbit, 5)}),
    play: async ({canvasElement}) => expect(shares(canvasElement)).toEqual(Array(5).fill('—')),
}

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

export const NoMetadataTransfers = tokenPage(bare, {transfers: rows(5, (h: number, i: number) => tokenTransfer(token(1), h, i, {token: bare}))}, TRANSFERS_TAB)

// a holder just short of half the largest supply with as many transactions as
// the index can count, and one holding its smallest unit that never sent one
export const ExtremeNumbers: StoryObj = {
    ...tokenPage(huge, {
        holders: [holder(huge, evmAddress(0), (BigInt(UINT256_MAX) / 2n).toString()), holder(huge, evmAddress(1), '1')],
        tallies: [{id: evmAddress(0), txCount: 2_147_483_647, firstSeenBlock: 0, lastActiveBlock: HEAD}, {...activity(evmAddress(1), 1), lastActiveBlock: null}],
    }),
    play: async ({canvasElement}) => {
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
        await expect(shares(canvasElement)).toEqual(['49.99%', '<0.01%'])
        await expect(columnTexts(canvasElement, 'Transactions')).toEqual(['2,147,483,647', '37'])
        expect(columnTexts(canvasElement, 'Last active')).toEqual([`#${fmtInt(HEAD)}`, ''])
    },
}

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
    proxyType: null,
    implementations: null,
}

export const DustSupply: StoryObj = {
    ...tokenPage(nlp, {
        holders: [holder(nlp, '0x0db8300836bd652c361c4158a8e69167cf33571f', '3162276660'), holder(nlp, '0x0000000000000000000000000000000000000001', '1000')],
    }),
    play: async ({canvas}) => {
        expect(canvas.getByText('Total supply').closest('[data-slot=card]')!.querySelector('[data-slot=card-title]')).toHaveTextContent('≈0 NLP')
        expect(canvas.getByRole('heading', {level: 1}).querySelector('[data-slot=badge]')).toHaveTextContent('LP NUMN/wWTMR')
    },
}

export const TransfersMany = tokenPage(WTMR, {transfers: rows(20, (h: number, i: number) => tokenTransfer(WTMR, h, i))}, TRANSFERS_TAB)

// the oldest transfers sit on the last page and end with the mint at the token's first block
export const TransfersLastPage = tokenPage(
    WTMR,
    {transfers: Array.from({length: 11}, (_, i) => tokenTransfer(WTMR, WTMR.firstBlock + 70 - i * 7, i, i === 10 ? {from: ZERO_ADDRESS} : {}))},
    {...TRANSFERS_TAB, page: '2416'}
)

export const TransfersOne = tokenPage(solo, {transfers: [tokenTransfer(solo, 999_990, 0, {from: ZERO_ADDRESS, to: evmAddress(0), amount: solo.totalSupply})]}, TRANSFERS_TAB)

export const TransfersEmpty = tokenPage(fresh, {}, TRANSFERS_TAB)

// one tx moving the token five times, newest log first like the whole list, 10,000 between 10,001 and 9,999
export const TransfersInOneTx: StoryObj = {
    ...tokenPage(WTMR, {transfers: tokenTransfersInOneTx(WTMR, HEAD - 5, [10_002, 10_001, 10_000, 9_999, 9_998])}, TRANSFERS_TAB),
    play: async ({canvas}) =>
        expect(canvas.getAllByText(/^[\d,]+ wWTMR$/).map(amount => amount.textContent)).toEqual(['10,002 wWTMR', '10,001 wWTMR', '10,000 wWTMR', '9,999 wWTMR', '9,998 wWTMR']),
}

// the zero transfer neither side sent is marked as poisoning, the zero one a side sent is not
export const TransfersEveryKind: StoryObj = {
    ...tokenPage(
        WTMR,
        {
            transfers: rows(8, (h: number, i: number) =>
                tokenTransfer(WTMR, h, i, [
                    {from: ZERO_ADDRESS, to: evmAddress(1), amount: units(500, 1)},
                    {from: evmAddress(2), to: ZERO_ADDRESS, amount: units(120.5, 1)},
                    {from: evmAddress(3), to: evmAddress(4), amount: units(42, 1)},
                    {from: evmAddress(5), to: evmAddress(5), amount: units(7, 1)},
                    {from: evmAddress(6), to: evmAddress(7), amount: '0', thirdParty: true},
                    {from: evmAddress(12), to: evmAddress(13), amount: '0'},
                    {from: evmAddress(8), to: evmAddress(9), amount: '1'},
                    {from: evmAddress(10), to: evmAddress(11), amount: UINT256_MAX},
                ][i])
            ),
        },
        TRANSFERS_TAB
    ),
    play: async ({canvasElement}) => expect(poisonedRows([...canvasElement.querySelectorAll('[data-slot=card] .divide-y > *')])).toEqual([false, false, false, false, true, false, false, false]),
}

const wtmrDeploy = evmTx(WTMR.deployTx.block.height, 0, {from: evmAddress(0), to: null, contractAddress: WTMR.id, input: bytecode(3_072), gasLimit: '3000000', gasUsed: '2100000', ...exit(EXIT.returned)})

// the token's own contract, read from Sourcify
export const Contract: StoryObj = {
    ...tokenPage(WTMR, {created: [wtmrDeploy], msw: [sourcify({body: NST})]}, {tab: 'contract'}),
    play: async ({canvas, canvasElement}) => {
        expect(canvas.getByRole('tab', {selected: true})).toHaveAccessibleName('Contract')
        expect(canvas.getByText('Exact match')).toBeVisible()
        expect(canvas.getByText('Creation code', {selector: 'div'}).nextElementSibling).toHaveTextContent('3,072 bytes')
        expectFits(...canvasElement.querySelectorAll('[data-slot=card]'))
    },
}
