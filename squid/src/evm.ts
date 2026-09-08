import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import {RpcClient, RpcError} from '@subsquid/rpc-client'
import {decodeUtf8} from './utf8'

export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export interface DecodedEvmTx {
    hash: string
    from: string
    to?: string
    contractAddress?: string
    value: bigint
    input: string
    nonce: number
    gasLimit: bigint
    gasPrice: bigint
    txType: string
    status: string
    exitReason: unknown
}

export interface DecodedErc20Transfer {
    token: string
    from: string
    to: string
    amount: bigint
}

// pallet_evm HashedAddressMapping, AccountId32 = blake2_256("evm:" ++ H160)
export function evmMappedAccount(h160: string): string {
    const input = new Uint8Array(24)
    input.set([0x65, 0x76, 0x6d, 0x3a])
    input.set(hexToBytes(h160.slice(2)), 4)
    return '0x' + bytesToHex(blake2b(input, {dkLen: 32}))
}

function asBigInt(v: unknown): bigint {
    if (typeof v === 'bigint') return v
    if (typeof v === 'string' || typeof v === 'number') return BigInt(v)
    if (Array.isArray(v)) {
        let out = 0n
        for (let i = v.length - 1; i >= 0; i--) out = (out << 64n) | asBigInt(v[i])
        return out
    }
    throw new Error(`cannot read ${JSON.stringify(v)} as bigint`)
}

// Decodes from the generic runtime decoding of Ethereum.transact args plus the
// Ethereum.Executed event args. The typed frontier helpers reject unknown tx
// variants like EIP7702, the generic path survives runtime upgrades.
export function decodeEvmTx(callArgs: any, executedArgs: any, baseFee: bigint): DecodedEvmTx {
    const txType: string = callArgs.transaction.__kind
    const t = callArgs.transaction.value
    const isCreate = t.action.__kind === 'Create'
    let gasPrice: bigint
    if (t.maxFeePerGas != null) {
        const maxFee = asBigInt(t.maxFeePerGas)
        const capped = baseFee + asBigInt(t.maxPriorityFeePerGas ?? 0)
        gasPrice = capped < maxFee ? capped : maxFee
    } else {
        gasPrice = asBigInt(t.gasPrice)
    }
    return {
        hash: (executedArgs.transactionHash as string).toLowerCase(),
        from: (executedArgs.from as string).toLowerCase(),
        to: isCreate ? undefined : (t.action.value as string).toLowerCase(),
        contractAddress: isCreate ? (executedArgs.to as string).toLowerCase() : undefined,
        value: asBigInt(t.value),
        input: t.input as string,
        nonce: Number(asBigInt(t.nonce)),
        gasLimit: asBigInt(t.gasLimit),
        gasPrice,
        txType,
        status: executedArgs.exitReason.__kind as string,
        exitReason: executedArgs.exitReason,
    }
}

export function decodeLog(eventArgs: any): {address: string; topics: string[]; data: string} {
    const log = eventArgs.log ?? eventArgs
    return {
        address: (log.address as string).toLowerCase(),
        topics: (log.topics as string[]).map(t => t.toLowerCase()),
        data: log.data as string,
    }
}

// nativeFacade is the published balances erc20 precompile, recognized as the
// native asset and never listed as a token
export function asErc20Transfer(log: {address: string; topics: string[]; data: string}, nativeFacade: string): DecodedErc20Transfer | undefined {
    if (log.topics.length !== 3 || log.topics[0] !== TRANSFER_TOPIC) return undefined
    if (log.address === nativeFacade) return undefined
    if (log.data.length !== 66) return undefined
    return {
        token: log.address,
        from: topicToAddress(log.topics[1]),
        to: topicToAddress(log.topics[2]),
        amount: BigInt(log.data),
    }
}

function topicToAddress(topic: string): string {
    return '0x' + topic.slice(26)
}

const SELECTORS = {name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567', totalSupply: '0x18160ddd', balanceOf: '0x70a08231'}

export interface Erc20Metadata {
    name?: string
    symbol?: string
    decimals?: number
}

/** `at` is the block the answers hold for, as an eth block number. */
export async function fetchErc20Metadata(rpc: RpcClient, token: string, at: string): Promise<Erc20Metadata> {
    const [name, symbol, decimals] = await Promise.all([
        ethCall(rpc, token, SELECTORS.name, at).then(abiDecodeString),
        ethCall(rpc, token, SELECTORS.symbol, at).then(abiDecodeString),
        ethCall(rpc, token, SELECTORS.decimals, at).then(abiDecodeUint8),
    ])
    return {name, symbol, decimals}
}

export async function fetchErc20Supply(rpc: RpcClient, token: string, at: string): Promise<bigint | undefined> {
    return abiDecodeUint(await ethCall(rpc, token, SELECTORS.totalSupply, at))
}

export async function fetchErc20Balance(rpc: RpcClient, token: string, holder: string, at: string): Promise<bigint | undefined> {
    return abiDecodeUint(await ethCall(rpc, token, SELECTORS.balanceOf + holder.slice(2).padStart(64, '0'), at))
}

// a revert is the contract's own answer, anything else is the node failing us
async function ethCall(rpc: RpcClient, to: string, data: string, at: string): Promise<string | undefined> {
    try {
        return await rpc.call('eth_call', [{to, data}, at])
    } catch (e) {
        if (e instanceof RpcError) return undefined
        throw e
    }
}

function abiDecodeString(ret: string | undefined): string | undefined {
    if (!ret || ret === '0x' || ret.length < 130) return undefined
    const len = Number(BigInt('0x' + ret.slice(66, 130)))
    if (len === 0 || ret.length < 130 + len * 2) return undefined
    return decodeUtf8('0x' + ret.slice(130, 130 + len * 2)) ?? undefined
}

function abiDecodeUint(ret: string | undefined): bigint | undefined {
    if (!ret || ret.length !== 66) return undefined
    return BigInt(ret)
}

function abiDecodeUint8(ret: string | undefined): number | undefined {
    const v = abiDecodeUint(ret)
    return v != null && v <= 255n ? Number(v) : undefined
}
