import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const validatorLocks =  {
    /**
     *  Active validator lock records, keyed by account.
     */
    v100: new StorageType('Validator.ValidatorLocks', 'Optional', [v100.AccountId32], v100.LockInfo) as ValidatorLocksV100,
}

/**
 *  Active validator lock records, keyed by account.
 */
export interface ValidatorLocksV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<(v100.LockInfo | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.LockInfo | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.LockInfo | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.LockInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.LockInfo | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.LockInfo | undefined)][]>
}

export const stakeExemptAccounts =  {
    /**
     *  Accounts allowed to join the validator set without locking stake.
     *  Consulted only when a candidate joins via `lock`; validators already
     *  in the set keep the amount recorded at join time.
     */
    v100: new StorageType('Validator.StakeExemptAccounts', 'Optional', [v100.AccountId32], sts.unit()) as StakeExemptAccountsV100,
}

/**
 *  Accounts allowed to join the validator set without locking stake.
 *  Consulted only when a candidate joins via `lock`; validators already
 *  in the set keep the amount recorded at join time.
 */
export interface StakeExemptAccountsV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<(null | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(null | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (null | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (null | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (null | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (null | undefined)][]>
}
