import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'

export const targetBlockTime =  {
    /**
     *  Target block time in seconds (e.g. 20).
     */
    v100: new ConstantType(
        'Difficulty.TargetBlockTime',
        sts.bigint()
    ),
}
