import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const key =  {
    /**
     *  Account holding the prime privileges.
     */
    v100: new StorageType('Prime.Key', 'Optional', [], v100.AccountId32) as KeyV100,
}

/**
 *  Account holding the prime privileges.
 */
export interface KeyV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block): Promise<(v100.AccountId32 | undefined)>
}
