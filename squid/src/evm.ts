import detectProxy from 'evm-proxy-detection'
import type {EvmState} from './evmState'
import {storage} from './types'
import type {RuntimeCtx} from './types/support'
import {decodeUtf8} from './utf8'

export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

export const SYNC_TOPIC = '0x1c411e9a96e071241c2f21f7726b17ae89e3cab4c78be50e062b03a9fffbbad1'

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000'

export type EvmEra = 'frontier' | 'revive'

// which pallet keeps the block's receipts tells the two eras apart
export function evmEra(header: RuntimeCtx & {height: number}): EvmEra {
    if (storage.ethereum.currentReceipts.v100.is(header)) return 'frontier'
    if (storage.revive.receiptInfoData.v10200.is(header)) return 'revive'
    throw new Error(`block ${header.height} runs neither Frontier nor revive`)
}

export interface DecodedErc20Transfer {
    token: string
    from: string
    to: string
    amount: bigint
}

export interface EvmLogData {
    address: string
    topics: string[]
    data: string
}

// nativeFacade is the published balances erc20 precompile, recognized as the
// native asset and never listed as a token
export function asErc20Transfer(log: EvmLogData, nativeFacade: string): DecodedErc20Transfer | undefined {
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

export interface PairReserves {
    reserve0: bigint
    reserve1: bigint
}

// Sync(uint112 reserve0, uint112 reserve1), any contract can emit it so the
// caller keeps it only for a token known to be a pair
export function asSync(log: {topics: string[]; data: string}): PairReserves | undefined {
    if (log.topics.length !== 1 || log.topics[0] !== SYNC_TOPIC) return undefined
    if (log.data.length !== 130) return undefined
    return {reserve0: BigInt('0x' + log.data.slice(2, 66)), reserve1: BigInt('0x' + log.data.slice(66))}
}

function topicToAddress(topic: string): string {
    return '0x' + topic.slice(26)
}

const SELECTORS = {name: '0x06fdde03', symbol: '0x95d89b41', decimals: '0x313ce567', totalSupply: '0x18160ddd', balanceOf: '0x70a08231', token0: '0x0dfe1681', token1: '0xd21220a7'}

export interface Erc20Metadata {
    name: string | null
    symbol: string | null
    decimals: number | null
}

export async function fetchErc20Metadata(state: EvmState, token: string): Promise<Erc20Metadata> {
    const [name, symbol, decimals] = await Promise.all([
        state.call(token, SELECTORS.name).then(abiDecodeString),
        state.call(token, SELECTORS.symbol).then(abiDecodeString),
        state.call(token, SELECTORS.decimals).then(abiDecodeUint8),
    ])
    return {name, symbol, decimals}
}

export interface PairMembers {
    token0: string | null
    token1: string | null
    token0Symbol: string | null
    token1Symbol: string | null
    token0Decimals: number | null
    token1Decimals: number | null
}

// a Uniswap V2 style pair answers token0() and token1() with the two tokens it
// pools, a token that answers anything else to either is no pair
export async function fetchPair(state: EvmState, token: string): Promise<PairMembers> {
    const [token0, token1] = await Promise.all([SELECTORS.token0, SELECTORS.token1].map(s => state.call(token, s).then(abiDecodeAddress)))
    if (token0 == null || token1 == null) return {token0: null, token1: null, token0Symbol: null, token1Symbol: null, token0Decimals: null, token1Decimals: null}
    const [token0Symbol, token1Symbol] = await Promise.all([token0, token1].map(t => state.call(t, SELECTORS.symbol).then(abiDecodeString)))
    const [token0Decimals, token1Decimals] = await Promise.all([token0, token1].map(t => state.call(t, SELECTORS.decimals).then(abiDecodeUint8)))
    return {token0, token1, token0Symbol, token1Symbol, token0Decimals, token1Decimals}
}

export interface ProxyTarget {
    proxyType: string | null
    implementations: string[] | null
}

class Reverted extends Error {}

// detectProxy reads any failed request as "not this kind of proxy", so a node
// failure is raised again rather than passing for a plain contract
export async function fetchProxy(state: EvmState, token: string): Promise<ProxyTarget> {
    let failure: unknown
    const answer = async (method: string, params: any[]): Promise<string> => {
        if (method === 'eth_getCode') return state.code(params[0])
        if (method === 'eth_getStorageAt') return state.storage(params[0], params[1])
        if (method !== 'eth_call') throw new Error(`evm-proxy-detection asked for ${method}`)
        const returned = await state.call(params[0].to, params[0].data)
        if (returned == null) throw new Reverted()
        return returned
    }
    const request: Parameters<typeof detectProxy>[1] = async ({method, params}) => {
        try {
            return await answer(method, params as any[])
        } catch (e) {
            if (!(e instanceof Reverted)) failure ??= e
            throw e
        }
    }
    const found = await detectProxy(token as `0x${string}`, request)
    if (failure != null) throw failure
    if (found == null) return {proxyType: null, implementations: null}
    const targets: string[] = Array.isArray(found.target) ? found.target : [found.target]
    return {proxyType: found.type, implementations: targets.map(t => t.toLowerCase())}
}

export async function fetchErc20Supply(state: EvmState, token: string): Promise<bigint | null> {
    return abiDecodeUint(await state.call(token, SELECTORS.totalSupply))
}

export async function fetchErc20Balance(state: EvmState, token: string, holder: string): Promise<bigint | null> {
    return abiDecodeUint(await state.call(token, SELECTORS.balanceOf + holder.slice(2).padStart(64, '0')))
}

function abiDecodeString(ret: string | null): string | null {
    if (!ret || ret === '0x' || ret.length < 130) return null
    const len = Number(BigInt('0x' + ret.slice(66, 130)))
    if (len === 0 || ret.length < 130 + len * 2) return null
    return decodeUtf8('0x' + ret.slice(130, 130 + len * 2))
}

function abiDecodeUint(ret: string | null): bigint | null {
    if (!ret || ret.length !== 66) return null
    return BigInt(ret)
}

function abiDecodeUint8(ret: string | null): number | null {
    const v = abiDecodeUint(ret)
    return v != null && v <= 255n ? Number(v) : null
}

function abiDecodeAddress(ret: string | null): string | null {
    const v = abiDecodeUint(ret)
    return v != null && v > 0n && v < 1n << 160n ? '0x' + v.toString(16).padStart(40, '0') : null
}
