import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const submissionDeposit =  {
    /**
     *  The minimum amount to be used as a deposit for a public referendum proposal.
     */
    v100: new ConstantType(
        'Referenda.SubmissionDeposit',
        sts.bigint()
    ),
}

export const tracks =  {
    /**
     *  A list of tracks.
     * 
     *  Note: if the tracks are dynamic, the value in the static metadata might be inaccurate.
     */
    v100: new ConstantType(
        'Referenda.Tracks',
        sts.array(() => sts.tuple(() => [sts.number(), v100.TrackDetails]))
    ),
}
