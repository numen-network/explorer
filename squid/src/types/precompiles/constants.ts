import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'
import * as v100 from '../v100'

export const balancesErc20 =  {
    /**
     *  EVM address of the native balance ERC20 facade. A wallet builds
     *  its withdraw call against this address and an indexer excludes
     *  it from token listings, so it is published for both to read
     *  rather than copied into each.
     */
    v100: new ConstantType(
        'Precompiles.BalancesErc20',
        v100.H160
    ),
}
