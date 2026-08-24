import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'

export const baseFeePerGas =  {
    v100: new StorageType('BaseFee.BaseFeePerGas', 'Default', [], sts.bigint()) as BaseFeePerGasV100,
}

export interface BaseFeePerGasV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): bigint
    get(block: Block): Promise<(bigint | undefined)>
}
