import {evmMappedAccount} from '@/lib/evm'
import {HEAD, paged, transfer} from '../../../../../mock/fixtures.js'
import {calldata, erc20Transfer, evmAddress, evmLog, evmTx, exit, EXIT, SELECTOR, token, TOPIC, topicOf, units, word, WTMR} from '../../../../../mock/fixtures/evm.js'
import {pageStory} from '../../../../.storybook/page'

type Tx = ReturnType<typeof evmTx>

export const txPage = (tx: {id: string}, {logs = [], transfers = []}: {logs?: object[]; transfers?: object[]} = {}, searchParams = {}) =>
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

export const alice = evmAddress(0)
export const bob = evmAddress(1)

const sent = units(1_234.5, WTMR.decimals)
export const call = evmTx(HEAD - 3, 0, {from: alice, to: WTMR.id, input: calldata(SELECTOR.transfer, bob, sent), gasLimit: '65000', gasUsed: '51234', nonce: 41, ...exit(EXIT.returned)})
export const callTransfer = erc20Transfer(call, 0, WTMR, alice, bob, sent)

const paid = units(12.5, 18)
export const plain = withNative(evmTx(HEAD - 50, 0, {from: bob, to: alice, value: paid, txType: 'Legacy', nonce: 7}), [bob, alice, paid])

const router = evmAddress(30)
const pair = evmAddress(31)
export const wrapped = token(8, {name: 'Wrapped NUMN', symbol: 'WNUMN'})
export const ore = token(5)
const swapIn = units(10, 18)
const swapOut = units(2_500, ore.decimals)
export const swap = withNative(
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
export const wrap = erc20Transfer(swap, 6, wrapped, router, pair, swapIn)
export const payout = erc20Transfer(swap, 7, ore, pair, bob, swapOut)
export const swapLogs = [
    evmLog(swap, 5, {address: wrapped.id, topics: [TOPIC.deposit, topicOf(router)], data: '0x' + word(swapIn)}),
    wrap.log,
    payout.log,
    evmLog(swap, 8, {address: pair, topics: [TOPIC.sync], data: '0x' + word(units(80_000, 18)) + word(units(20_000_000, 18))}),
    evmLog(swap, 9, {address: pair, topics: [TOPIC.swap, topicOf(router), topicOf(bob)], data: '0x' + word(swapIn) + word(0) + word(0) + word(swapOut)}),
]

const disperse = evmAddress(50)
const airdrop = evmTx(HEAD - 80, 0, {from: alice, to: disperse, input: calldata('0xc73a2d60', WTMR.id, 0x60, 0x60), gasLimit: '4000000', gasUsed: '3412876', ...exit(EXIT.returned)})
export const drops = Array.from({length: 120}, (_, i) => erc20Transfer(airdrop, i, WTMR, disperse, evmAddress(100 + i), units(10 + i, WTMR.decimals)))
export const airdropPage = (tab: string, page = '1') => txPage(airdrop, {logs: drops.map(d => d.log), transfers: drops.map(d => d.transfer)}, {tab, page})

// a tx late in a block of over ten thousand logs, each amount equal to its log number so the order shows on screen
const crowded = evmTx(HEAD - 90, 1, {from: alice, to: disperse, input: calldata('0xc73a2d60', WTMR.id, 0x60, 0x60), gasLimit: '400000', gasUsed: '187654', ...exit(EXIT.returned)})
const crowdedDrops = [9_997, 9_998, 9_999, 10_000, 10_001, 10_002].map((logIndex, i) => erc20Transfer(crowded, logIndex, WTMR, disperse, evmAddress(200 + i), units(logIndex, WTMR.decimals)))
export const crowdedPage = (tab: string) => txPage(crowded, {logs: crowdedDrops.map(d => d.log), transfers: crowdedDrops.map(d => d.transfer)}, {tab})
