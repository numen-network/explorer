import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'

export const existentialDeposit =  {
    /**
     *  The minimum amount required to keep an account open. MUST BE GREATER THAN ZERO!
     * 
     *  If you *really* need it to be zero, you can enable the feature `insecure_zero_ed` for
     *  this pallet. However, you do so at your own risk: this will open up a major DoS vector.
     *  In case you have multiple sources of provider references, you may also get unexpected
     *  behaviour if you set this to zero.
     * 
     *  Bottom line: Do yourself a favour and make it at least one!
     */
    v100: new ConstantType(
        'Balances.ExistentialDeposit',
        sts.bigint()
    ),
}
