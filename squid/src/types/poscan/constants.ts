import {sts, Block, Bytes, Option, Result, ConstantType, RuntimeCtx} from '../support'

export const protocol =  {
    /**
     *  Domain separation prefix of the scan the runtime verifies against.
     *  An external miner reads it to confirm it speaks this protocol
     *  before it starts hashing.
     */
    v100: new ConstantType(
        'Poscan.Protocol',
        sts.bytes()
    ),
}

export const engine =  {
    /**
     *  Consensus engine the PoW digest is tagged with. An indexer reads it
     *  to pick the seal out of a block's digest logs.
     */
    v100: new ConstantType(
        'Poscan.Engine',
        sts.bytes()
    ),
}
