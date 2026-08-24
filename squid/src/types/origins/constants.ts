import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const spendCaps =  {
    v100: new ConstantType(
        'Origins.SpendCaps',
        sts.array(() => sts.tuple(() => [sts.number(), v100.Origin, sts.bigint()]))
    ),
}
