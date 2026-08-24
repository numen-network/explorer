import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'

export const currentDifficulty =  {
    /**
     *  Current mining difficulty (U256).
     * 
     *  Updated each block by the ASERT calculation in `on_finalize`.
     *  Initially set via genesis config.
     */
    v100: new StorageType('Difficulty.CurrentDifficulty', 'Default', [], sts.bigint()) as CurrentDifficultyV100,
}

/**
 *  Current mining difficulty (U256).
 * 
 *  Updated each block by the ASERT calculation in `on_finalize`.
 *  Initially set via genesis config.
 */
export interface CurrentDifficultyV100  {
    is(block: RuntimeCtx): boolean
    getDefault(block: Block): bigint
    get(block: Block): Promise<(bigint | undefined)>
}
