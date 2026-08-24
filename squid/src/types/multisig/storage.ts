import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const multisigs =  {
    /**
     *  The set of open multisig operations.
     */
    v100: new StorageType('Multisig.Multisigs', 'Optional', [v100.AccountId32, sts.bytes()], v100.Multisig) as MultisigsV100,
}

/**
 *  The set of open multisig operations.
 */
export interface MultisigsV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key1: v100.AccountId32, key2: Bytes): Promise<(v100.Multisig | undefined)>
    getMany(block: Block, keys: [v100.AccountId32, Bytes][]): Promise<(v100.Multisig | undefined)[]>
    getKeys(block: Block): Promise<[v100.AccountId32, Bytes][]>
    getKeys(block: Block, key1: v100.AccountId32): Promise<[v100.AccountId32, Bytes][]>
    getKeys(block: Block, key1: v100.AccountId32, key2: Bytes): Promise<[v100.AccountId32, Bytes][]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<[v100.AccountId32, Bytes][]>
    getKeysPaged(pageSize: number, block: Block, key1: v100.AccountId32): AsyncIterable<[v100.AccountId32, Bytes][]>
    getKeysPaged(pageSize: number, block: Block, key1: v100.AccountId32, key2: Bytes): AsyncIterable<[v100.AccountId32, Bytes][]>
    getPairs(block: Block): Promise<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
    getPairs(block: Block, key1: v100.AccountId32): Promise<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
    getPairs(block: Block, key1: v100.AccountId32, key2: Bytes): Promise<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key1: v100.AccountId32): AsyncIterable<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key1: v100.AccountId32, key2: Bytes): AsyncIterable<[k: [v100.AccountId32, Bytes], v: (v100.Multisig | undefined)][]>
}
