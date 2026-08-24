import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const totalIssuance =  {
    /**
     *  The total units issued in the system.
     */
    v100: new StorageType('Balances.TotalIssuance', 'Default', [], sts.bigint()) as TotalIssuanceV100,
}

/**
 *  The total units issued in the system.
 */
export interface TotalIssuanceV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): bigint
    get(block: Block): Promise<(bigint | undefined)>
}

export const inactiveIssuance =  {
    /**
     *  The total units of outstanding deactivated balance in the system.
     */
    v100: new StorageType('Balances.InactiveIssuance', 'Default', [], sts.bigint()) as InactiveIssuanceV100,
}

/**
 *  The total units of outstanding deactivated balance in the system.
 */
export interface InactiveIssuanceV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): bigint
    get(block: Block): Promise<(bigint | undefined)>
}

export const locks =  {
    /**
     *  Any liquidity locks on some account balances.
     *  NOTE: Should only be accessed when setting, changing and freeing a lock.
     * 
     *  Use of locks is deprecated in favour of freezes. See `https://github.com/paritytech/substrate/pull/12951/`
     */
    v100: new StorageType('Balances.Locks', 'Default', [v100.AccountId32], sts.array(() => v100.BalanceLock)) as LocksV100,
}

/**
 *  Any liquidity locks on some account balances.
 *  NOTE: Should only be accessed when setting, changing and freeing a lock.
 * 
 *  Use of locks is deprecated in favour of freezes. See `https://github.com/paritytech/substrate/pull/12951/`
 */
export interface LocksV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v100.BalanceLock[]
    get(block: Block, key: v100.AccountId32): Promise<(v100.BalanceLock[] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.BalanceLock[] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.BalanceLock[] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.BalanceLock[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.BalanceLock[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.BalanceLock[] | undefined)][]>
}

export const holds =  {
    /**
     *  Holds on account balances.
     */
    v100: new StorageType('Balances.Holds', 'Default', [v100.AccountId32], sts.array(() => v100.IdAmount)) as HoldsV100,
}

/**
 *  Holds on account balances.
 */
export interface HoldsV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v100.IdAmount[]
    get(block: Block, key: v100.AccountId32): Promise<(v100.IdAmount[] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.IdAmount[] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.IdAmount[] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.IdAmount[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.IdAmount[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.IdAmount[] | undefined)][]>
}
