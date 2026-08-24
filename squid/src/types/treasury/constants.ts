import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const palletId =  {
    /**
     *  The treasury's pallet id, used for deriving its sovereign account ID.
     */
    v100: new ConstantType(
        'Treasury.PalletId',
        v100.PalletId
    ),
}
