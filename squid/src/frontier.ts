import {blake2b} from '@noble/hashes/blake2.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import {Src} from '@subsquid/scale-codec'
import type {Block as BlockData, Event as EventData} from '@subsquid/substrate-processor'
import {toJSON} from '@subsquid/util-internal-json'
import {BatchData} from './batch'
import type {EvmLogData} from './evm'
import {recordLog} from './evmLogs'
import {Block, EvmTransaction} from './model'
import type {Fields} from './processor'
import {constants, storage} from './types'

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

function decodeLog(eventArgs: any): EvmLogData {
    const log = eventArgs.log ?? eventArgs
    return {
        address: (log.address as string).toLowerCase(),
        topics: (log.topics as string[]).map(t => t.toLowerCase()),
        data: log.data as string,
    }
}

const FRONTIER_ENGINE = Buffer.from('fron')

export function parseEvmBlockHash(logs: string[]): string | undefined {
    for (const log of logs) {
        const bytes = Buffer.from(log.slice(2), 'hex')
        if (bytes[0] !== 4 || !bytes.subarray(1, 5).equals(FRONTIER_ENGINE)) continue
        const src = new Src(bytes.subarray(5))
        const payload = Buffer.from(src.bytes(src.compactLength()))
        if (payload[0] !== 1) throw new Error('frontier post log is not PostLog::Hashes')
        return '0x' + payload.subarray(1, 33).toString('hex')
    }
    return undefined
}

export async function mapFrontierEvm(batch: BatchData, b: BlockData<Fields>, block: Block, at: Date): Promise<void> {
    const transacts = b.extrinsics.filter(x => x.call?.name === 'Ethereum.transact')
    if (transacts.length === 0) return
    const h = b.header
    // on_finalize sets the base fee for the block after, so a block's txs pay
    // the one its parent left
    const parent = h.getParent()
    const receiptsStore = storage.ethereum.currentReceipts.v100
    const baseFeeStore = storage.baseFee.baseFeePerGas.v100
    const facadeConst = constants.precompiles.balancesErc20.v100
    if (!receiptsStore.is(h) || !baseFeeStore.is(parent) || !facadeConst.is(h)) {
        throw new Error(`unhandled spec version at block ${h.height}`)
    }
    const receipts = (await receiptsStore.get(h)) ?? []
    const baseFee = (await baseFeeStore.get(parent)) ?? baseFeeStore.getDefault(parent)
    const nativeFacade = facadeConst.get(h)
    if (receipts.length !== transacts.length) {
        throw new Error(`receipt count ${receipts.length} does not match evm tx count ${transacts.length} at block ${h.height}`)
    }
    const logsByExt = new Map<number, EventData<Fields>[]>()
    for (const ev of b.events) {
        if (ev.name === 'EVM.Log' && ev.extrinsicIndex != null) {
            let arr = logsByExt.get(ev.extrinsicIndex)
            if (arr == null) logsByExt.set(ev.extrinsicIndex, (arr = []))
            arr.push(ev)
        }
    }
    let prevGas = 0n
    let blockLogIndex = 0
    for (let txIndex = 0; txIndex < transacts.length; txIndex++) {
        const ext = transacts[txIndex]
        const executed = b.events.find(ev => ev.extrinsicIndex === ext.index && ev.name === 'Ethereum.Executed')
        if (executed == null) throw new Error(`Ethereum.transact without Executed event at block ${h.height}`)
        const decoded = decodeEvmTx(ext.call!.args, executed.args, baseFee)
        // frontier receipts carry cumulative gas following eth receipt semantics
        const cumGas = receipts[txIndex].value.usedGas
        const gasUsed = cumGas - prevGas
        prevGas = cumGas
        const extrinsic = batch.extrinsicById.get(ext.id)!
        // no fee event covers an EVM call, the base fee is what it cost and what
        // the sender paid over it is the EVM's own kind of tip, handed to the
        // miner whole like a substrate one
        extrinsic.fee = gasUsed * baseFee
        extrinsic.tip = gasUsed * (decoded.gasPrice - baseFee)
        batch.feePayers.set(extrinsic.id, evmMappedAccount(decoded.from))
        // canonical home of the tx payload is EvmTransaction, keep the call row lean
        batch.callById.get(ext.call!.id)!.args = null
        batch.act(evmMappedAccount(decoded.from), h.height).evmAddress = decoded.from
        // a transaction counts once for each address that sent, received or created it
        for (const addr of new Set([decoded.from, decoded.to ?? decoded.contractAddress!])) batch.touchEvm(addr, h.height, 1)
        batch.actEvm(decoded.from, h.height)
        const evmTx = new EvmTransaction({
            id: decoded.hash,
            extrinsic,
            block,
            txIndex,
            from: decoded.from,
            to: decoded.to,
            contractAddress: decoded.contractAddress,
            value: decoded.value,
            input: Buffer.from(decoded.input.slice(2), 'hex'),
            inputSelector: decoded.input.length >= 10 ? decoded.input.slice(0, 10) : undefined,
            nonce: decoded.nonce,
            gasLimit: decoded.gasLimit,
            gasUsed,
            gasPrice: decoded.gasPrice,
            txType: decoded.txType,
            success: decoded.status === 'Succeed',
            exitReason: toJSON(decoded.exitReason),
            dispatchError: null,
            timestamp: at,
        })
        batch.evmTxs.push(evmTx)
        for (const logEv of logsByExt.get(ext.index) ?? []) {
            const id = `${decoded.hash}-${blockLogIndex}`
            recordLog(batch, decodeLog(logEv.args), {id, logIndex: blockLogIndex, transaction: evmTx, extrinsic, sender: decoded.from, block, at, nativeFacade})
            blockLogIndex++
        }
    }
}
