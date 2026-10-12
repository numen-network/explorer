import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const newAccount =  {
    name: 'System.NewAccount',
    /**
     * A new account was created.
     */
    v100: new EventType(
        'System.NewAccount',
        sts.struct({
            account: v100.AccountId32,
        })
    ),
}
