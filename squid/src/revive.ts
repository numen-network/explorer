import {keccak_256} from '@noble/hashes/sha3.js'
import {bytesToHex, hexToBytes} from '@noble/hashes/utils.js'
import type {Block as BlockData, BlockHeader, Event as EventData, Extrinsic as ExtrinsicData} from '@subsquid/substrate-processor'
import {toJSON} from '@subsquid/util-internal-json'
import {RLP} from 'micro-eth-signer/core/rlp.js'
import {BatchData} from './batch'
import {recordLog} from './evmLogs'
import {Deposit, gasRoundUp} from './fees'
import {Block, EvmTransaction, Extrinsic} from './model'
import {Fields, originOf} from './processor'
import {calls, constants, events, storage} from './types'

const FALLBACK_PADDING = 'ee'.repeat(12)
const ZERO_HASH = '0x' + '00'.repeat(32)
// the EIP-2718 types revive admits, under the names Frontier's TransactionV2 gives them
const TX_TYPES: Record<number, string> = {1: 'EIP2930', 2: 'EIP1559'}
// nonce and gasLimit positions in each type's field list. to, value and data
// come right after gasLimit in every type
const LAYOUT: Record<string, {nonce: number; gasLimit: number}> = {
    Legacy: {nonce: 0, gasLimit: 2},
    EIP2930: {nonce: 1, gasLimit: 3},
    EIP1559: {nonce: 1, gasLimit: 4},
}

interface EthTx {
    txType: string
    nonce: bigint
    gasLimit: bigint
    to: string | undefined
    value: bigint
    input: Uint8Array
}

export interface FeeSplit {
    author: string | undefined
    treasury: string
    deposits: Map<number, Deposit[]>
}

// AccountId32Mapper's account for an H160 that OriginalAccount has no entry for
export const fallbackAccount = (h160: string): string => h160 + FALLBACK_PADDING

// AccountId32Mapper::to_address, an account padded with 0xEE drops the padding
// and any other keeps the last 20 bytes of its keccak256
export function toAddress(account: string): string {
    return account.endsWith(FALLBACK_PADDING) ? account.slice(0, 42) : '0x' + bytesToHex(keccak_256(hexToBytes(account.slice(2)))).slice(24)
}

// on_finalize files the block's Ethereum hash under its own number
export async function reviveBlockHash(h: BlockHeader<Fields>): Promise<string | undefined> {
    const s = storage.revive.blockHash.v10200
    if (!s.is(h)) throw new Error(`unhandled Revive.BlockHash shape at block ${h.height}`)
    const hash = await s.get(h, h.height)
    return hash === ZERO_HASH ? undefined : hash
}

/** The H160 that maps to each account, null for an account its H160 maps elsewhere. */
export async function reviveEvmAddresses(h: BlockHeader<Fields>, ids: string[]): Promise<(string | null)[]> {
    const s = storage.revive.originalAccount.v10200
    if (!s.is(h)) throw new Error(`unhandled Revive.OriginalAccount shape at block ${h.height}`)
    const h160s = ids.map(toAddress)
    const originals = await s.getMany(h, h160s)
    return ids.map((id, i) => ((originals[i] ?? fallbackAccount(h160s[i])) === id ? h160s[i] : null))
}

export async function mapReviveEvm(batch: BatchData, b: BlockData<Fields>, block: Block, at: Date, fees: FeeSplit): Promise<void> {
    const h = b.header
    const facadeConst = constants.precompiles.balancesErc20.v100
    if (!facadeConst.is(h)) throw new Error(`unhandled Precompiles.BalancesErc20 shape at block ${h.height}`)
    const nativeFacade = facadeConst.get(h)
    const txs = await mapTransactions(batch, b, block, at, fees)
    // a contract logs the same way whoever called it, an SS58 account through
    // Revive.call included
    for (const ev of b.events) {
        if (!events.revive.contractEmitted.v10200.is(ev)) continue
        const {contract, topics, data} = events.revive.contractEmitted.v10200.decode(ev)
        const tx = ev.extrinsicIndex == null ? undefined : txs.get(ev.extrinsicIndex)
        const origin = ev.call == null ? undefined : originOf(ev.call)
        recordLog(batch, {address: contract, topics, data}, {
            id: tx == null ? ev.id : `${tx.id}-${ev.index}`,
            logIndex: ev.index,
            transaction: tx ?? null,
            extrinsic: ev.extrinsic == null ? null : batch.extrinsicById.get(ev.extrinsic.id)!,
            sender: tx?.from ?? (origin == null ? undefined : toAddress(origin)),
            block,
            at,
            nativeFacade,
        })
    }
}

// the receipts list one entry per Revive.eth_transact in block order
async function mapTransactions(batch: BatchData, b: BlockData<Fields>, block: Block, at: Date, fees: FeeSplit): Promise<Map<number, EvmTransaction>> {
    const txs = new Map<number, EvmTransaction>()
    const transacts = b.extrinsics.filter(x => x.call?.name === 'Revive.eth_transact')
    if (transacts.length === 0) return txs
    const h = b.header
    const receiptsStore = storage.revive.receiptInfoData.v10200
    if (!receiptsStore.is(h)) throw new Error(`unhandled Revive.ReceiptInfoData shape at block ${h.height}`)
    const receipts = (await receiptsStore.get(h)) ?? receiptsStore.getDefault(h)
    if (receipts.length !== transacts.length) {
        throw new Error(`receipt count ${receipts.length} does not match evm tx count ${transacts.length} at block ${h.height}`)
    }
    transacts.forEach((ext, i) => txs.set(ext.index, mapTransaction(batch, b, ext, receipts[i], block, at, fees)))
    return txs
}

function mapTransaction(batch: BatchData, b: BlockData<Fields>, ext: ExtrinsicData<Fields>, receipt: {gasUsed: bigint; effectiveGasPrice: bigint}, block: Block, at: Date, fees: FeeSplit): EvmTransaction {
    const h = b.header
    const ethTransact = calls.revive.ethTransact.v10200
    if (!ethTransact.is(ext.call!)) throw new Error(`unhandled Revive.eth_transact shape at block ${h.height}`)
    const {payload} = ethTransact.decode(ext.call!)
    const tx = decodePayload(ext, payload)
    const own = b.events.filter(ev => ev.extrinsicIndex === ext.index)
    const payer = feePayer(ext, own)
    const from = toAddress(payer)
    const {to} = tx
    const revert = own.find(ev => events.revive.ethExtrinsicRevert.v10200.is(ev))
    const contractAddress = createdBy(own, from)
    if (to != null && contractAddress != null) throw new Error(`call in extrinsic ${ext.id} reports its sender instantiating ${contractAddress}`)
    if (to == null && revert == null && contractAddress == null) throw new Error(`creation in extrinsic ${ext.id} went through without Instantiated`)
    const extrinsic = batch.extrinsicById.get(ext.id)!
    settleGasRoundUp(extrinsic, gasRoundUp(fees.deposits.get(ext.index) ?? [], payer, fees.author, fees.treasury), receipt.effectiveGasPrice)
    // canonical home of the tx payload is EvmTransaction, keep the call row lean
    batch.callById.get(ext.call!.id)!.args = null
    batch.act(payer, h.height)
    // a transaction counts once for each address that sent, received or created it
    for (const addr of new Set([from, to ?? contractAddress])) if (addr != null) batch.touchEvm(addr, h.height, 1)
    batch.actEvm(from, h.height)
    const evmTx = new EvmTransaction({
        id: '0x' + bytesToHex(keccak_256(hexToBytes(payload.slice(2)))),
        extrinsic,
        block,
        txIndex: ext.index,
        from,
        to,
        contractAddress,
        value: tx.value,
        input: Buffer.from(tx.input),
        inputSelector: tx.input.length >= 4 ? '0x' + bytesToHex(tx.input.subarray(0, 4)) : undefined,
        nonce: Number(tx.nonce),
        gasLimit: tx.gasLimit,
        gasUsed: receipt.gasUsed,
        gasPrice: receipt.effectiveGasPrice,
        txType: tx.txType,
        success: revert == null,
        exitReason: null,
        dispatchError: revert == null ? null : toJSON(events.revive.ethExtrinsicRevert.v10200.decode(revert).dispatchError),
        timestamp: at,
    })
    batch.evmTxs.push(evmTx)
    return evmTx
}

// revive takes txs Ethereum rejects, e.g. a tip above the fee cap or a high s.
// so the payload is read raw, with no validation
function decodePayload(ext: ExtrinsicData<Fields>, payload: string): EthTx {
    const bytes = hexToBytes(payload.slice(2))
    const typed = bytes[0] < 0x80
    const txType = typed ? TX_TYPES[bytes[0]] : 'Legacy'
    if (txType == null) throw new Error(`extrinsic ${ext.id} carries a type ${bytes[0]} transaction, which revive rejects`)
    const fields = RLP.decode(typed ? bytes.subarray(1) : bytes) as Uint8Array[]
    const {nonce, gasLimit} = LAYOUT[txType]
    const uint = (b: Uint8Array) => (b.length === 0 ? 0n : BigInt('0x' + bytesToHex(b)))
    const to = fields[gasLimit + 1]
    return {
        txType,
        nonce: uint(fields[nonce]),
        gasLimit: uint(fields[gasLimit]),
        to: to.length === 0 ? undefined : '0x' + bytesToHex(to),
        value: uint(fields[gasLimit + 2]),
        input: fields[gasLimit + 3],
    }
}

// TransactionPayment charges the signer revive recovers
function feePayer(ext: ExtrinsicData<Fields>, own: EventData<Fields>[]): string {
    const paid = own.find(ev => ev.name === 'TransactionPayment.TransactionFeePaid')
    if (paid == null) throw new Error(`evm tx in extrinsic ${ext.id} paid no fee`)
    return paid.args.who
}

// Instantiated only reports the contract a transaction creates itself, never
// one a contract creates along the way
function createdBy(own: EventData<Fields>[], from: string): string | undefined {
    for (const ev of own) {
        if (!events.revive.instantiated.v10200.is(ev)) continue
        const {deployer, contract} = events.revive.instantiated.v10200.decode(ev)
        if (deployer === from) return contract
    }
    return undefined
}

// what the rounding burns is part of what the transaction cost, short of one gas
function settleGasRoundUp(extrinsic: Extrinsic, round: {miner: bigint; treasury: bigint}, gasPrice: bigint): void {
    const burnt = round.miner + round.treasury
    if (burnt === 0n) return
    if (burnt >= gasPrice) throw new Error(`extrinsic ${extrinsic.id} burns ${burnt} rounding its gas up, a whole gas or more at ${gasPrice}`)
    if (extrinsic.fee == null) throw new Error(`extrinsic ${extrinsic.id} rounds its gas up but paid no fee`)
    extrinsic.fee += burnt
    extrinsic.minerFee += round.miner
    extrinsic.treasuryFee += round.treasury
}
