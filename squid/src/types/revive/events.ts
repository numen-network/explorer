import {sts, Block, Bytes, Option, Result, EventType, RuntimeCtx} from '../support'
import * as v10200 from '../v10200'

export const contractEmitted =  {
    name: 'Revive.ContractEmitted',
    /**
     * A custom event emitted by the contract.
     */
    v10200: new EventType(
        'Revive.ContractEmitted',
        sts.struct({
            /**
             * The contract that emitted the event.
             */
            contract: v10200.H160,
            /**
             * Data supplied by the contract. Metadata generated during contract compilation
             * is needed to decode it.
             */
            data: sts.bytes(),
            /**
             * A list of topics used to index the event.
             * Number of topics is capped by [`limits::NUM_EVENT_TOPICS`].
             */
            topics: sts.array(() => v10200.H256),
        })
    ),
}

export const instantiated =  {
    name: 'Revive.Instantiated',
    /**
     * Contract deployed by deployer at the specified address.
     */
    v10200: new EventType(
        'Revive.Instantiated',
        sts.struct({
            deployer: v10200.H160,
            contract: v10200.H160,
        })
    ),
}

export const ethExtrinsicRevert =  {
    name: 'Revive.EthExtrinsicRevert',
    /**
     * Emitted when an Ethereum transaction reverts.
     * 
     * Ethereum transactions always complete successfully at the extrinsic level,
     * as even reverted calls must store their `ReceiptInfo`.
     * To distinguish reverted calls from successful ones, this event is emitted
     * for failed Ethereum transactions.
     */
    v10200: new EventType(
        'Revive.EthExtrinsicRevert',
        sts.struct({
            dispatchError: v10200.DispatchError,
        })
    ),
}
