import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const vesting =  {
    /**
     *  Information regarding the vesting of a given account.
     */
    v100: new StorageType('Vesting.Vesting', 'Optional', [v100.AccountId32], sts.array(() => v100.VestingInfo)) as VestingV100,
}

/**
 *  Information regarding the vesting of a given account.
 */
export interface VestingV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block, key: v100.AccountId32): Promise<(v100.VestingInfo[] | undefined)>
    getMany(block: Block, keys: v100.AccountId32[]): Promise<(v100.VestingInfo[] | undefined)[]>
    getKeys(block: Block): Promise<v100.AccountId32[]>
    getKeys(block: Block, key: v100.AccountId32): Promise<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block): AsyncIterable<v100.AccountId32[]>
    getKeysPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<v100.AccountId32[]>
    getPairs(block: Block): Promise<[k: v100.AccountId32, v: (v100.VestingInfo[] | undefined)][]>
    getPairs(block: Block, key: v100.AccountId32): Promise<[k: v100.AccountId32, v: (v100.VestingInfo[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block): AsyncIterable<[k: v100.AccountId32, v: (v100.VestingInfo[] | undefined)][]>
    getPairsPaged(pageSize: number, block: Block, key: v100.AccountId32): AsyncIterable<[k: v100.AccountId32, v: (v100.VestingInfo[] | undefined)][]>
}
