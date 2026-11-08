import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v10200 from '../v10200'

export const originalAccount =  {
    /**
     *  Map a Ethereum address to its original `AccountId32`.
     * 
     *  When deriving a `H160` from an `AccountId32` we use a hash function. In order to
     *  reconstruct the original account we need to store the reverse mapping here.
     *  Register your `AccountId32` using [`Pallet::map_account`] in order to
     *  use it with this pallet.
     */
    v10200: new StorageType('Revive.OriginalAccount', 'Optional', [v10200.H160], v10200.AccountId32) as OriginalAccountV10200,
}

/**
 *  Map a Ethereum address to its original `AccountId32`.
 * 
 *  When deriving a `H160` from an `AccountId32` we use a hash function. In order to
 *  reconstruct the original account we need to store the reverse mapping here.
 *  Register your `AccountId32` using [`Pallet::map_account`] in order to
 *  use it with this pallet.
 */
export interface OriginalAccountV10200  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v10200.H160): Promise<(v10200.AccountId32 | undefined)>
    getMany(block: Block, keys: v10200.H160[]): Promise<(v10200.AccountId32 | undefined)[]>
    getKeys(block: Block): Promise<v10200.H160[]>
    getKeys(block: Block, key: v10200.H160): Promise<v10200.H160[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v10200.H160[]>
    getKeysPaged(pageSize: number, block: Block, key: v10200.H160): AsyncIterable<v10200.H160[]>
    getPairs(block: Block): Promise<[k: v10200.H160, v: (v10200.AccountId32 | undefined)][]>
    getPairs(block: Block, key: v10200.H160): Promise<[k: v10200.H160, v: (v10200.AccountId32 | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v10200.H160, v: (v10200.AccountId32 | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v10200.H160): AsyncIterable<[k: v10200.H160, v: (v10200.AccountId32 | undefined)][]>
}

export const blockHash =  {
    /**
     *  Mapping for block number and hashes.
     * 
     *  The maximum number of elements stored is capped by the block hash count `BLOCK_HASH_COUNT`.
     */
    v10200: new StorageType('Revive.BlockHash', 'Default', [sts.number()], v10200.H256) as BlockHashV10200,
}

/**
 *  Mapping for block number and hashes.
 * 
 *  The maximum number of elements stored is capped by the block hash count `BLOCK_HASH_COUNT`.
 */
export interface BlockHashV10200  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v10200.H256
    get(block: Block, key: number): Promise<(v10200.H256 | undefined)>
    getMany(block: Block, keys: number[]): Promise<(v10200.H256 | undefined)[]>
    getKeys(block: Block): Promise<number[]>
    getKeys(block: Block, key: number): Promise<number[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<number[]>
    getKeysPaged(pageSize: number, block: Block, key: number): AsyncIterable<number[]>
    getPairs(block: Block): Promise<[k: number, v: (v10200.H256 | undefined)][]>
    getPairs(block: Block, key: number): Promise<[k: number, v: (v10200.H256 | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: number, v: (v10200.H256 | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: number): AsyncIterable<[k: number, v: (v10200.H256 | undefined)][]>
}

export const receiptInfoData =  {
    /**
     *  The details needed to reconstruct the receipt info offchain.
     * 
     *  This contains valuable information about the gas used by the transaction.
     * 
     *  NOTE: The item is unbound and should therefore never be read on chain.
     *  It could otherwise inflate the PoV size of a block.
     */
    v10200: new StorageType('Revive.ReceiptInfoData', 'Default', [], sts.array(() => v10200.ReceiptGasInfo)) as ReceiptInfoDataV10200,
}

/**
 *  The details needed to reconstruct the receipt info offchain.
 * 
 *  This contains valuable information about the gas used by the transaction.
 * 
 *  NOTE: The item is unbound and should therefore never be read on chain.
 *  It could otherwise inflate the PoV size of a block.
 */
export interface ReceiptInfoDataV10200  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v10200.ReceiptGasInfo[]
    get(block: Block): Promise<(v10200.ReceiptGasInfo[] | undefined)>
}
