import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const validators =  {
    /**
     *  The current set of validators.
     */
    v100: new StorageType('Session.Validators', 'Default', [], sts.array(() => v100.AccountId32)) as ValidatorsV100,
}

/**
 *  The current set of validators.
 */
export interface ValidatorsV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): v100.AccountId32[]
    get(block: Block): Promise<(v100.AccountId32[] | undefined)>
}
