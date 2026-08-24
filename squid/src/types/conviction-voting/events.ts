import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const delegated =  {
    name: 'ConvictionVoting.Delegated',
    /**
     * An account has delegated their vote to another account. \[who, target\]
     */
    v100: new EventType(
        'ConvictionVoting.Delegated',
        sts.tuple([v100.AccountId32, v100.AccountId32, sts.number()])
    ),
}

export const undelegated =  {
    name: 'ConvictionVoting.Undelegated',
    /**
     * An \[account\] has cancelled a previous delegation operation.
     */
    v100: new EventType(
        'ConvictionVoting.Undelegated',
        sts.tuple([v100.AccountId32, sts.number()])
    ),
}
