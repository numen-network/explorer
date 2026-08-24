import {sts, Block, Bytes, Option, Result, StorageType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const currentReceipts =  {
    /**
     *  The current Ethereum receipts.
     */
    v100: new StorageType('Ethereum.CurrentReceipts', 'Optional', [], sts.array(() => v100.ReceiptV4)) as CurrentReceiptsV100,
}

/**
 *  The current Ethereum receipts.
 */
export interface CurrentReceiptsV100  {
    is(block: RuntimeCtx): boolean
    get(block: Block): Promise<(v100.ReceiptV4[] | undefined)>
}
