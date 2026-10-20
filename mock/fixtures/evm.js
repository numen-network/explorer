import {HEAD, at, chainInfo, hashOf, squidId} from '../fixtures.js'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'
export const UINT256_MAX = (2n ** 256n - 1n).toString()
const GWEI = 10n ** 9n

export const TOPIC = {
    transfer: '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef',
    deposit: '0xe1fffcc4923d04b559f4d29a8bfc6cda04eb5b0d3c460751c2402c5c5cc9109c',
    ownershipTransferred: '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0',
    swap: '0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822',
    sync: '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1',
}

export const SELECTOR = {
    transfer: '0xa9059cbb',
    transferFrom: '0x23b872dd',
    approve: '0x095ea7b3',
    swapExactETHForTokens: '0x7ff36ab5',
    withdraw: '0x3ccfd60b',
}

export const evmAddress = n => '0x' + hashOf('evm', n).slice(2, 42)
const evmTxHash = (...seed) => hashOf('evm-tx', ...seed)

// base units of a token, n carries up to six decimals
export const units = (n, decimals) => ((BigInt(Math.round(n * 1e6)) * 10n ** BigInt(decimals)) / 10n ** 6n).toString()

// one 32 byte abi word, an address or an amount
export const word = value => BigInt(value).toString(16).padStart(64, '0')
export const topicOf = address => '0x' + word(address)
export const calldata = (selector, ...args) => selector + args.map(word).join('')
export const bytecode = bytes => '0x60806040' + Array.from({length: Math.ceil(bytes / 32)}, (_, i) => hashOf('code', i).slice(2)).join('').slice(0, bytes * 2 - 8)

// what any token that is no pair answers for the two tokens a pair pools
const NO_PAIR = {token0: null, token1: null, token0Symbol: null, token1Symbol: null}

const NO_PROXY = {proxyType: null, implementations: null}

// the create tx as a token links it, the first tx of the block it landed in
export const deployTx = (height, from = evmAddress(0)) => ({id: evmTxHash(height, 0), from, block: {height}})

// a token behind a proxy, as evm-proxy-detection names the kind and what it delegates to
export const proxy = (proxyType, ...implementations) => ({proxyType, implementations})

// the one token the explorer has a logo for, as its mainnet contract describes itself
export const WTMR = {
    id: '0xa1795b3c6f74866c7def1df390f9e2e403dca2e9',
    name: 'Wrapped WTMR',
    symbol: 'wWTMR',
    decimals: 1,
    totalSupply: units(1_250_000, 1),
    holderCount: 1_204,
    transferCount: 48_311,
    deployTx: deployTx(412_000),
    firstBlock: 412_007,
    ...NO_PAIR,
    ...NO_PROXY,
}

const KINDS = [
    {name: 'Orbit Dollar', symbol: 'oUSD', decimals: 6},
    {name: 'Polaris Governance', symbol: 'PLRS', decimals: 18},
    {name: 'Redshift Credit', symbol: 'RSC', decimals: 18},
    {name: 'Nova Fund Share', symbol: 'NOVA', decimals: 12},
    {name: 'Comet Points', symbol: 'CMT', decimals: 0},
    {name: 'Asteroid Ore', symbol: 'ORE', decimals: 18},
    {name: 'Spectral Shard', symbol: 'SHRD', decimals: 9},
    {name: 'Lunar Bond', symbol: 'LBND', decimals: 18},
    {name: 'Muddy Waters', symbol: 'MUD', decimals: 18},
    {name: 'Kuiper Belt Dust', symbol: 'DUST', decimals: 18},
]

// tokens with no logo, a lower n moves more transfers so token(0), token(1)... is the list order
export function token(n, traits = {}) {
    const kind = KINDS[n % KINDS.length]
    const transferCount = Math.round(30_000 / (n + 1))
    return {
        id: evmAddress(1000 + n),
        ...kind,
        totalSupply: units(21_000_000, kind.decimals),
        holderCount: Math.ceil(transferCount / 7),
        transferCount,
        deployTx: deployTx(420_000 + n * 9_000, evmAddress(n % 7)),
        firstBlock: 420_000 + n * 9_000 + 4,
        ...NO_PAIR,
        ...NO_PROXY,
        ...traits,
    }
}

// the native coin as a pair pools it, through its ERC20 precompile
export const NUMN = {address: chainInfo.nativeErc20, symbol: 'NUMN'}

// a Uniswap V2 style pair's share token, each pooled token as its address and symbol() answer
export const pair = (n, token0, token1, traits = {}) =>
    token(n, {name: 'NumenDEX LP Token', symbol: 'NDEX-LP', decimals: 18, totalSupply: units(1_585.72, 18), token0: token0.address, token1: token1.address, token0Symbol: token0.symbol, token1Symbol: token1.symbol, ...traits})

export const holder = (tok, address, balance) => ({id: `${tok.id}-${address}`, address, balance})

// largest first and falling off by rank, the order the holder list asks for
export const holders = (tok, count, offset = 0) =>
    Array.from({length: count}, (_, i) => holder(tok, evmAddress(offset + i), ((BigInt(tok.totalSupply) * 12n) / 100n / BigInt(offset + i + 1)).toString()))

// what the index tallied for an address, n spreads the numbers apart
export const activity = (address, n = 0) => ({id: address, txCount: (n * 37) % 900, firstSeenBlock: 36_861 + n * 7_919, lastActiveBlock: HEAD - n * 1_303})

// what the index tallied for one address's token, a single transfer in unless traits say otherwise
export const holding = (tok, balance, traits = {}) => ({
    id: `${tok.id}-${evmAddress(0)}`,
    balance,
    transferInVolume: balance ?? '0',
    transferOutVolume: '0',
    transferInCount: 1,
    transferOutCount: 0,
    firstInBlock: tok.firstBlock,
    token: tok,
    ...traits,
})

// by token name and then token address, the order the holdings list asks for
export const holdings = count =>
    Array.from({length: count}, (_, i) => token(i))
        .map((t, i) => holding(t, units(37 * (i + 1), t.decimals)))
        .sort((a, b) => a.token.name.localeCompare(b.token.name) || (a.token.id < b.token.id ? -1 : 1))

// one row per way a holding can render, in the order the query returns them
export const EVERY_HOLDING = [
    holding(token(8, {name: 'A token name long enough to crowd its balance off a phone screen'}), units(42, 18)),
    holding(token(4, {totalSupply: UINT256_MAX}), UINT256_MAX),
    holding(token(3, {decimals: null}), units(77, 12)),
    holding(token(0), units(12.5, 6)),
    holding(token(1), units(5_000_000, 18)),
    holding(token(6, {symbol: null}), units(1_234, 9)),
    holding(WTMR, units(1_234.5, 1), {transferInVolume: units(1_300, 1), transferOutVolume: units(65.5, 1), transferInCount: 14, transferOutCount: 3}),
    holding(token(2, {name: null}), units(250_000, 18), {firstInBlock: null}),
]

// rows the index keeps for tokens an address doesn't hold, a zero balance or no answer to balanceOf
export const NOT_HELD = [holding(token(7), '0'), holding(token(5), null)]

export const EXIT = {
    stopped: {__kind: 'Succeed', value: {__kind: 'Stopped'}},
    returned: {__kind: 'Succeed', value: {__kind: 'Returned'}},
    reverted: {__kind: 'Revert', value: {__kind: 'Reverted'}},
    outOfGas: {__kind: 'Error', value: {__kind: 'OutOfGas'}},
    notSupported: {__kind: 'Fatal', value: {__kind: 'NotSupported'}},
}

// the indexer writes status as the variant name of the ExitReason it stores
export const exit = reason => ({status: reason.__kind, exitReason: reason})

export function evmTx(height, index, traits = {}) {
    const tx = {
        id: evmTxHash(height, index),
        txIndex: index,
        from: evmAddress(index % 7),
        to: evmAddress((index % 7) + 7),
        contractAddress: null,
        value: '0',
        input: '0x',
        nonce: height % 977,
        gasLimit: '21000',
        gasUsed: '21000',
        gasPrice: (1000n * GWEI).toString(),
        txType: 'EIP1559',
        ...exit(EXIT.stopped),
        timestamp: at(height),
        block: {height},
        extrinsic: {id: squidId(height, index + 1), transfers: []},
        ...traits,
    }
    return {inputSelector: tx.input.length >= 10 ? tx.input.slice(0, 10) : null, ...tx}
}

export const evmLog = (tx, logIndex, traits = {}) => ({
    id: `${tx.id}-${logIndex}`,
    logIndex,
    address: tx.to ?? tx.contractAddress,
    topics: [],
    data: '0x',
    ...traits,
})

// a Transfer log and the token transfer the indexer reads out of it, under one id
export function erc20Transfer(tx, logIndex, tok, from, to, amount) {
    const log = evmLog(tx, logIndex, {address: tok.id, topics: [TOPIC.transfer, topicOf(from), topicOf(to)], data: '0x' + word(amount)})
    return {log, transfer: {id: log.id, from, to, amount, thirdParty: tx.from !== from && tx.from !== to, timestamp: tx.timestamp, token: tok, transaction: {id: tx.id}, block: tx.block}}
}

// one token moving across many transactions, rows() lays them out newest first
export const tokenTransfer = (tok, height, index, traits = {}) => ({
    id: `${evmTxHash(height, index)}-${index}`,
    from: evmAddress(index % 7),
    to: evmAddress((index % 7) + 7),
    amount: units(1 + ((height * 31 + index * 17) % 5000) / 3, tok.decimals ?? 0),
    thirdParty: false,
    timestamp: at(height),
    token: tok,
    transaction: {id: evmTxHash(height, index)},
    block: {height},
    ...traits,
})

// one tx's transfers at the given log numbers, each amount equal to its log number so the order shows on screen
export const tokenTransfersInOneTx = (tok, height, logIndexes) =>
    logIndexes.map((logIndex, i) => tokenTransfer(tok, height, 0, {id: `${evmTxHash(height, 0)}-${logIndex}`, to: evmAddress(100 + i), amount: units(logIndex, tok.decimals ?? 0)}))
