import {sts, Block, Bytes, Option, Result, CallType, RuntimeCtx} from '../support'

export const ethTransact =  {
    name: 'Revive.eth_transact',
    /**
     * A raw EVM transaction, typically dispatched by an Ethereum JSON-RPC server.
     * 
     * # Parameters
     * 
     * * `payload`: The encoded [`crate::evm::TransactionSigned`].
     * 
     * # Note
     * 
     * This call cannot be dispatched directly; attempting to do so will result in a failed
     * transaction. It serves as a wrapper for an Ethereum transaction. When submitted, the
     * runtime converts it into a [`sp_runtime::generic::CheckedExtrinsic`] by recovering the
     * signer and validating the transaction.
     */
    v10200: new CallType(
        'Revive.eth_transact',
        sts.struct({
            payload: sts.bytes(),
        })
    ),
}
