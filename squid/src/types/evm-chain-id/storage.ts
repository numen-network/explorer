import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'

export const chainId =  {
    /**
     *  The EVM chain ID.
     */
    v100: new StorageType('EVMChainId.ChainId', 'Default', [], sts.bigint()) as ChainIdV100,
}

/**
 *  The EVM chain ID.
 */
export interface ChainIdV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): bigint
    get(block: Block): Promise<(bigint | undefined)>
}
