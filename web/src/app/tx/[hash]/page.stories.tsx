import type {StoryObj} from '@storybook/nextjs-vite'
import {expect} from 'storybook/test'
import {shortAddr} from '@/components/AddressText'
import {evmMappedAccount} from '@/lib/evm'
import {HEAD, paged, transfer} from '../../../../../mock/fixtures.js'
import {bytecode, calldata, erc20Transfer, evmAddress, evmLog, evmTx, exit, EXIT, SELECTOR, token, TOPIC, topicOf, UINT256_MAX, units, word, WTMR, ZERO_ADDRESS} from '../../../../../mock/fixtures/evm.js'
import {expectAddressForm, expectFits, PHONE, tokenLabels} from '../../../../.storybook/fit'
import {lastPage, pageMeta, pageStory} from '../../../../.storybook/page'
import EvmTxPage from './page'

// pages get the chain's EVM id from the root layout, token logos are keyed by it
export default {title: 'Pages/EVM Transaction', ...pageMeta(EvmTxPage)}

type Tx = ReturnType<typeof evmTx>

const txPage = (tx: {id: string}, {logs = [], transfers = []}: {logs?: object[]; transfers?: object[]} = {}, searchParams = {}) =>
    pageStory(
        {evmTransactionById: tx, evmLogs: paged(logs), evmLogsConnection: {totalCount: logs.length}, tokenTransfers: paged(transfers), tokenTransfersConnection: {totalCount: transfers.length}},
        {params: {hash: tx.id}, searchParams}
    )

// value an EVM call moves lands as a balances transfer between the mapped substrate accounts, in the same extrinsic
const withNative = (tx: Tx, ...moves: [from: string, to: string, amount: string][]) => ({
    ...tx,
    extrinsic: {
        ...tx.extrinsic,
        transfers: moves.map(([from, to, amount], i) =>
            transfer(tx.block.height, 2 + i, {from: {id: evmMappedAccount(from)}, to: {id: evmMappedAccount(to)}, amount, call: {pallet: 'Ethereum', method: 'transact'}, extrinsic: {id: tx.extrinsic.id}})
        ),
    },
})

const LOGS_TAB = {tab: 'logs'}

const alice = evmAddress(0)
const bob = evmAddress(1)

const sent = units(1_234.5, WTMR.decimals)
const call = evmTx(HEAD - 3, 0, {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, sent), gasLimit: '65000', gasUsed: '51234', nonce: 41, ...exit(EXIT.returned)})
const callTransfer = erc20Transfer(call, 0, WTMR, alice, bob, sent)

export const CallSucceeded = txPage(call, {logs: [callTransfer.log], transfers: [callTransfer.transfer]})

export const CallSucceededLogs = txPage(call, {logs: [callTransfer.log], transfers: [callTransfer.transfer]}, LOGS_TAB)

export const Reverted = txPage(
    evmTx(HEAD - 10, 1, {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, units(9_999_999, WTMR.decimals)), gasLimit: '65000', gasUsed: '24871', nonce: 42, ...exit(EXIT.reverted)})
)

export const OutOfGas = txPage(
    evmTx(HEAD - 20, 0, {from: bob, to: token(0).id, input: calldata(SELECTOR.approve, alice, UINT256_MAX), gasLimit: '30000', gasUsed: '30000', txType: 'EIP2930', ...exit(EXIT.outOfGas)})
)

export const FatalError = txPage(evmTx(HEAD - 30, 0, {from: bob, to: alice, value: units(1, 18), txType: 'EIP7702', ...exit(EXIT.notSupported)}))

export const InputShorterThanSelector = txPage(evmTx(HEAD - 35, 0, {from: bob, to: alice, input: '0x01', gasLimit: '25000', gasUsed: '21016'}))

const bare = token(3, {name: null, symbol: null, decimals: null})
const bareSent = units(77, 12)
const bareCall = evmTx(HEAD - 45, 0, {from: alice, to: bare.id, input: calldata(SELECTOR.transfer, bob, bareSent), gasLimit: '65000', gasUsed: '48000', ...exit(EXIT.returned)})
const bareTransfer = erc20Transfer(bareCall, 0, bare, alice, bob, bareSent)

export const TokenWithoutMetadata = txPage(bareCall, {logs: [bareTransfer.log], transfers: [bareTransfer.transfer]})

const dust = token(9)
const creation = evmTx(HEAD - 40, 0, {from: alice, to: null, contractAddress: dust.id, input: bytecode(4_321), gasLimit: '3000000', gasUsed: '2456789', txType: 'Legacy', ...exit(EXIT.returned)})
const mint = erc20Transfer(creation, 1, dust, ZERO_ADDRESS, alice, dust.totalSupply)
const ownership = evmLog(creation, 0, {topics: [TOPIC.ownershipTransferred, topicOf(ZERO_ADDRESS), topicOf(alice)]})

export const ContractCreation = txPage(creation, {logs: [ownership, mint.log], transfers: [mint.transfer]})

export const ContractCreationInputOpen: StoryObj = {
    ...txPage(creation, {logs: [ownership, mint.log], transfers: [mint.transfer]}),
    play: async ({canvas, userEvent}) => {
        await userEvent.click(canvas.getByText(/bytes$/))
    },
}

const paid = units(12.5, 18)
const plain = withNative(evmTx(HEAD - 50, 0, {from: bob, to: alice, value: paid, txType: 'Legacy', nonce: 7}), [bob, alice, paid])

export const PlainValueTransfer = txPage(plain)

export const NoLogs = txPage(plain, {}, LOGS_TAB)

const router = evmAddress(30)
const pair = evmAddress(31)
const wrapped = token(8, {name: 'Wrapped NUMN', symbol: 'WNUMN'})
const ore = token(5)
const swapIn = units(10, 18)
const swapOut = units(2_500, ore.decimals)
const swap = withNative(
    evmTx(HEAD - 60, 2, {
        from: bob,
        to: router,
        value: swapIn,
        input: calldata(SELECTOR.swapExactETHForTokens, swapOut, 0x80, bob, 1_790_000_000, 2, wrapped.id, ore.id),
        gasLimit: '250000',
        gasUsed: '187654',
        ...exit(EXIT.returned),
    }),
    [bob, router, swapIn],
    [router, wrapped.id, swapIn]
)
const wrap = erc20Transfer(swap, 6, wrapped, router, pair, swapIn)
const payout = erc20Transfer(swap, 7, ore, pair, bob, swapOut)
const swapLogs = [
    evmLog(swap, 5, {address: wrapped.id, topics: [TOPIC.deposit, topicOf(router)], data: '0x' + word(swapIn)}),
    wrap.log,
    payout.log,
    evmLog(swap, 8, {address: pair, topics: [TOPIC.sync], data: '0x' + word(units(80_000, 18)) + word(units(20_000_000, 18))}),
    evmLog(swap, 9, {address: pair, topics: [TOPIC.swap, topicOf(router), topicOf(bob)], data: '0x' + word(swapIn) + word(0) + word(0) + word(swapOut)}),
]

export const SwapEveryTab = txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]})

// in log order, the wrap ahead of the payout
export const SwapTokenTransfers: StoryObj = {
    ...txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}, {tab: 'transfers'}),
    play: async ({canvasElement}) => expect(tokenLabels(canvasElement)).toEqual([shortAddr(wrapped.id), shortAddr(ore.id)]),
}

export const SwapLogs = txPage(swap, {logs: swapLogs, transfers: [wrap.transfer, payout.transfer]}, LOGS_TAB)

// from, to and every log address keep their full form on a phone and wrap inside their rows
export const SwapLogsOnPhone: StoryObj = {
    ...SwapLogs,
    globals: PHONE,
    play: async ({canvasElement}) => {
        expectAddressForm(canvasElement, 'full')
        expectFits(...[...canvasElement.querySelectorAll('a[href^="/address/"]')].map(link => link.closest('[data-slot=card] > *')!))
    },
}

const disperse = evmAddress(50)
const airdrop = evmTx(HEAD - 80, 0, {from: alice, to: disperse, input: calldata('0xc73a2d60', WTMR.id, 0x60, 0x60), gasLimit: '4000000', gasUsed: '3412876', ...exit(EXIT.returned)})
const drops = Array.from({length: 120}, (_, i) => erc20Transfer(airdrop, i, WTMR, disperse, evmAddress(100 + i), units(10 + i, WTMR.decimals)))
const airdropPage = (tab: string, page = '1') => txPage(airdrop, {logs: drops.map(d => d.log), transfers: drops.map(d => d.transfer)}, {tab, page})

export const AirdropTokenTransfers = airdropPage('transfers')

export const AirdropTokenTransfersPage2 = airdropPage('transfers', '2')

export const AirdropTokenTransfersLastPage = airdropPage('transfers', lastPage(drops.length))

export const AirdropLogs = airdropPage('logs')

export const AirdropLogsPage2 = airdropPage('logs', '2')

export const AirdropLogsLastPage = airdropPage('logs', lastPage(drops.length))

export const ExtremeNumbers = txPage(
    evmTx(HEAD - 70, 0, {value: UINT256_MAX, gasLimit: '30000000', gasUsed: '29999999', gasPrice: (10n ** 18n).toString(), nonce: 2_147_483_647, txType: 'Legacy'})
)
