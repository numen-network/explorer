import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortAddr} from '@/components/AddressText'
import {paged, rows} from '../../../../../mock/fixtures.js'
import {bytecode, calldata, EVERY_HOLDING, evmAddress, evmTx, exit, EXIT, holding, holdings, NOT_HELD, SELECTOR, token, UINT256_MAX, units, WTMR} from '../../../../../mock/fixtures/evm.js'
import {tabCount, tokenLabels} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import EvmAddressPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Address', ...pageMeta(EvmAddressPage)}

interface AddressData {
    txs?: object[]
    holdings?: object[]
    notHeld?: object[]
    created?: object[]
    asToken?: object | null
}

type HolderArgs = {where: {balance_gt?: number}; limit: number; offset: number}

// the page asks evmTransactions twice, for the address's own list and for the tx that created it.
// the index keeps rows for tokens the address doesn't hold, only a query asking for a balance above zero leaves them out
const addressPage = (address: string, {txs = [], holdings = [], notHeld = [], created = [], asToken = null}: AddressData = {}, searchParams = {}) => {
    const holderRows = ({where}: HolderArgs) => (where.balance_gt === 0 ? holdings : [...holdings, ...notHeld])
    return pageStory(
        {
            evmTransactions: (args: {where: {OR?: unknown}; limit: number; offset: number}) => (args.where.OR ? paged(txs)(args) : created),
            evmTransactionsConnection: {totalCount: txs.length},
            tokenHolders: (args: HolderArgs) => paged(holderRows(args))(args),
            tokenHoldersConnection: (args: HolderArgs) => ({totalCount: holderRows(args).length}),
            tokenById: asToken,
        },
        {params: {address}, searchParams}
    )
}

const HOLDINGS_TAB = {tab: 'holdings'}

const alice = evmAddress(0)
const bob = evmAddress(1)

const everyTx = [
    {from: alice, to: bob, value: units(12.5, 18), txType: 'Legacy'},
    {from: bob, to: alice, value: units(0.000001, 18)},
    {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(10, 1)), gasLimit: '65000', gasUsed: '51234', txType: 'EIP2930', ...exit(EXIT.returned)},
    {from: alice, to: null, contractAddress: evmAddress(40), input: bytecode(2_048), gasLimit: '3000000', gasUsed: '1800000', ...exit(EXIT.returned)},
    {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(9_999_999, 1)), gasLimit: '65000', gasUsed: '24871', ...exit(EXIT.reverted)},
    {from: alice, to: token(0).id, input: calldata(SELECTOR.approve, bob, UINT256_MAX), gasLimit: '30000', gasUsed: '30000', ...exit(EXIT.outOfGas)},
    {from: alice, to: bob, value: units(1, 18), txType: 'EIP7702', ...exit(EXIT.notSupported)},
    {from: alice, to: alice, value: units(3, 18)},
    {from: bob, to: alice, value: UINT256_MAX},
]

export const EoaEmpty = addressPage(alice)

export const EoaOneTx = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])]})

export const EoaTxsEveryCase = addressPage(alice, {txs: rows(everyTx.length, (h: number, i: number) => evmTx(h, 0, everyTx[i]))})

const manyTxs = rows(63, (h: number, i: number) => evmTx(h, i % 3, i % 2 ? {from: bob, to: alice, value: units(i * 1.5, 18)} : {from: alice, to: evmAddress(2 + (i % 5)), value: units(i, 18)}))

export const EoaTxsMany = addressPage(alice, {txs: manyTxs})

export const EoaTxsPage2 = addressPage(alice, {txs: manyTxs}, {page: '2'})

export const EoaTxsLastPage = addressPage(alice, {txs: manyTxs}, {page: lastPage(manyTxs.length)})

export const EoaHoldings: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: EVERY_HOLDING}, HOLDINGS_TAB),
    play: async ({canvasElement}) =>
        expect(tokenLabels(canvasElement)).toEqual([
            'A token name long enough to crowd its balance off a phone screen',
            'Comet Points',
            'Nova Fund Share',
            'Orbit Dollar',
            'Polaris Governance',
            'Spectral Shard',
            'Wrapped WTMR',
            shortAddr(token(2).id),
        ]),
}

export const EoaHoldingsOne = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: [holding(WTMR, units(1_234.5, 1))]}, HOLDINGS_TAB)

// a token at a zero balance or with no answer to balanceOf is neither listed nor counted
export const EoaHoldingsSkipNotHeld: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: [holding(token(1), units(5_000_000, 18)), holding(WTMR, units(1_234.5, 1))], notHeld: NOT_HELD}, HOLDINGS_TAB),
    play: async ({canvasElement}) => {
        expect(tokenLabels(canvasElement)).toEqual(['Polaris Governance', 'Wrapped WTMR'])
        expect(tabCount(canvasElement, 'holdings')).toBe('2')
    },
}

// with nothing held there is no tokens tab, and a link to it opens the first tab
export const EoaHoldingsNoneHeld: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], notHeld: NOT_HELD}, HOLDINGS_TAB),
    play: async ({canvas, canvasElement}) => {
        expect(tabCount(canvasElement, 'holdings')).toBeNull()
        expect(canvas.getByRole('tab', {selected: true})).toHaveAccessibleName(/^Transactions/)
    },
}

const manyHoldings = holdings(50)

// fifty holdings share ten token names, five rows to a name
const fiveEach = (...names: string[]) => names.flatMap(name => Array(5).fill(name))

export const EoaHoldingsMany: StoryObj = {
    ...addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, HOLDINGS_TAB),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual(fiveEach('Asteroid Ore', 'Comet Points', 'Kuiper Belt Dust', 'Lunar Bond')),
}

export const EoaHoldingsPage2 = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, {...HOLDINGS_TAB, page: '2'})

export const EoaHoldingsLastPage = addressPage(alice, {txs: [evmTx(999_990, 0, everyTx[0])], holdings: manyHoldings}, {...HOLDINGS_TAB, page: lastPage(manyHoldings.length)})

const contract = evmAddress(40)
const deploy = evmTx(900_000, 0, {from: alice, to: null, contractAddress: contract, input: bytecode(2_048), gasLimit: '3000000', gasUsed: '1800000', ...exit(EXIT.returned)})

export const ContractDeployed = addressPage(contract, {
    txs: [...rows(4, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: contract, input: calldata(SELECTOR.withdraw), gasLimit: '50000', gasUsed: '29870', ...exit(i === 2 ? EXIT.reverted : EXIT.returned)})), deploy],
    created: [deploy],
})

const wtmrDeploy = evmTx(WTMR.deployBlock, 0, {from: alice, to: null, contractAddress: WTMR.id, input: bytecode(3_072), gasLimit: '3000000', gasUsed: '2100000', ...exit(EXIT.returned)})

export const TokenContract = addressPage(WTMR.id, {
    txs: [...rows(3, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(i + 1, 1)), gasLimit: '65000', gasUsed: '51234', ...exit(EXIT.returned)})), wtmrDeploy],
    created: [wtmrDeploy],
    asToken: WTMR,
})

const factoryBuilt = token(3, {name: null, symbol: null, deployBlock: null})

export const TokenContractNoMetadata = addressPage(factoryBuilt.id, {
    txs: rows(2, (h: number, i: number) => evmTx(h, i, {from: evmAddress(i), to: factoryBuilt.id, input: calldata(SELECTOR.transfer, bob, units(5, 12)), gasLimit: '65000', gasUsed: '48000', ...exit(EXIT.returned)})),
    asToken: factoryBuilt,
})
