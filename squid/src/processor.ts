import 'dotenv/config'
import {Call as CallData, DataHandlerContext, SubstrateBatchProcessor, SubstrateBatchProcessorFields} from '@subsquid/substrate-processor'
import {Store} from '@subsquid/typeorm-store'
import {RpcClient} from '@subsquid/rpc-client'

const RPC_ENDPOINT = process.env.RPC_ENDPOINT
if (!RPC_ENDPOINT) throw new Error('RPC_ENDPOINT is not set')

export const rpc = new RpcClient({url: RPC_ENDPOINT})

export const processor = new SubstrateBatchProcessor()
    .setRpcEndpoint(RPC_ENDPOINT)
    .setBlockRange({from: 0})
    .includeAllBlocks()
    .addEvent({extrinsic: true, call: true, stack: true})
    .addCall({extrinsic: true})
    .setFields({
        block: {timestamp: true, digest: true},
        extrinsic: {hash: true, tip: true, success: true, error: true, signature: true},
        call: {name: true, args: true, success: true, origin: true},
        event: {name: true, args: true, phase: true},
    })

export type Fields = SubstrateBatchProcessorFields<typeof processor>
export type Ctx = DataHandlerContext<Store, Fields>

// who a nested call really dispatches as, which proxy and multisig move away
// from the signer. as_derivative and as_multi_threshold_1 leave it unresolved
// upstream, dropping those is better than crediting the wrong account
export function originOf(call: CallData<Fields>): string | undefined {
    const o = call.origin as any
    return o?.__kind === 'system' && o.value?.__kind === 'Signed' ? (o.value.value as string) : undefined
}
