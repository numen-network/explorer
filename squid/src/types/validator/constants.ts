import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'

export const sessionPeriod =  {
    /**
     *  Session period used for periodic session rotation.
     */
    v100: new ConstantType(
        'Validator.SessionPeriod',
        sts.number()
    ),
}

export const sessionOffset =  {
    /**
     *  Delay before the first session starts.
     */
    v100: new ConstantType(
        'Validator.SessionOffset',
        sts.number()
    ),
}
