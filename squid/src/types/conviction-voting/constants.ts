import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'

export const voteLockingPeriod =  {
    /**
     *  The minimum period of vote locking.
     * 
     *  It should be no shorter than enactment period to ensure that in the case of an approval,
     *  those successful voters are locked into the consequences that their votes entail.
     */
    v100: new ConstantType(
        'ConvictionVoting.VoteLockingPeriod',
        sts.number()
    ),
}
