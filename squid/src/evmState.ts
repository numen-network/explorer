import type {RpcClient} from '@subsquid/rpc-client'
import {getDynamicBuilder, getLookupFn} from '@polkadot-api/metadata-builders'
import {AccountId, Bytes, Option, decAnyMetadata, u32, unifyMetadata} from '@polkadot-api/substrate-bindings'

/** What contracts answer at one block, the way eth_call, eth_getCode and eth_getStorageAt would. */
export interface EvmState {
    /** The return data, null when the call reverted or failed. */
    call(to: string, data: string): Promise<string | null>
    code(address: string): Promise<string>
    storage(address: string, slot: string): Promise<string>
}

interface Header {
    hash: string
    specVersion: number
}

type Metadata = ReturnType<typeof unifyMetadata>
type Builder = ReturnType<typeof getDynamicBuilder>
type RuntimeCall = ReturnType<Builder['buildRuntimeCall']>
type Run = (api: string, method: string, inputs: string[]) => (args: unknown[]) => Promise<any>

const ZERO_WORD = '0x' + '00'.repeat(32)
const ZERO_H160 = '0x' + '00'.repeat(20)
// an eth_call naming no sender runs from the zero H160, whose account AccountId32Mapper pads out with 0xEE
const ZERO_H160_ACCOUNT = AccountId().dec(new Uint8Array([...new Uint8Array(20), ...new Uint8Array(12).fill(0xee)]))
// ReturnFlags::REVERT
const REVERT = 1

const hex = (bytes: Uint8Array) => '0x' + Buffer.from(bytes).toString('hex')
const bytes = (hexString: string) => new Uint8Array(Buffer.from(hexString.slice(2), 'hex'))
// a U256 travels as four little endian u64 limbs
const u256 = (v: bigint) => [0n, 64n, 128n, 192n].map(shift => (v >> shift) & 0xffffffffffffffffn)

// the runtime APIs and their types come with metadata v15, read once per spec version
const runtimes = new Map<number, Promise<{metadata: Metadata; builder: Builder}>>()

function runtimeAt(rpc: RpcClient, header: Header) {
    let runtime = runtimes.get(header.specVersion)
    if (runtime == null) {
        runtime = rpc.call('state_call', ['Metadata_metadata_at_version', hex(u32.enc(15)), header.hash]).then((raw: string) => {
            const metadata = unifyMetadata(decAnyMetadata(Option(Bytes()).dec(raw)!))
            return {metadata, builder: getDynamicBuilder(getLookupFn(metadata))}
        })
        runtimes.set(header.specVersion, runtime)
    }
    return runtime
}

/** Reads contracts through the EVM runtime API of the runtime that ran the block, so no eth RPC is involved. */
export async function evmStateAt(rpc: RpcClient, header: Header): Promise<EvmState> {
    const {metadata, builder} = await runtimeAt(rpc, header)
    const run: Run = (api, method, inputs) => {
        const found = metadata.apis.find(a => a.name === api)?.methods.find(m => m.name === method)
        if (found == null || found.inputs.map(i => i.name).join() !== inputs.join()) throw new Error(`unhandled ${api}.${method} in spec ${header.specVersion}`)
        const call: RuntimeCall = builder.buildRuntimeCall(api, method)
        return async args => call.value.dec(await rpc.call('state_call', [`${api}_${method}`, hex(call.args.enc(args)), header.hash]))
    }
    if (metadata.apis.some(a => a.name === 'EthereumRuntimeRPCApi')) return frontierState(run)
    if (metadata.apis.some(a => a.name === 'ReviveApi')) return reviveState(run)
    throw new Error(`spec ${header.specVersion} offers no EVM runtime API`)
}

// the block gas limit is plenty for a view call, and as with fc-rpc every
// outcome but Succeed counts as no answer
function frontierState(run: Run): EvmState {
    const call = run('EthereumRuntimeRPCApi', 'call', ['from', 'to', 'data', 'value', 'gas_limit', 'max_fee_per_gas', 'max_priority_fee_per_gas', 'nonce', 'estimate', 'access_list', 'authorization_list', 'state_override'])
    const currentBlock = run('EthereumRuntimeRPCApi', 'current_block', [])
    const storageAt = run('EthereumRuntimeRPCApi', 'storage_at', ['address', 'index'])
    const codeAt = run('EthereumRuntimeRPCApi', 'account_code_at', ['address'])
    let gasLimit: Promise<bigint[]> | undefined
    return {
        async call(to, data) {
            gasLimit ??= currentBlock([]).then(block => block.header.gas_limit)
            const res = await call([ZERO_H160, to, bytes(data), u256(0n), await gasLimit, undefined, undefined, undefined, false, undefined, undefined, []])
            return res.success && res.value.exit_reason.type === 'Succeed' ? hex(res.value.value) : null
        },
        async code(address) {
            return hex(await codeAt([address]))
        },
        async storage(address, slot) {
            return storageAt([address, u256(BigInt(slot))])
        },
    }
}

// a call that reverts says so in its flags, and an address with no contract
// reads as an empty slot
function reviveState(run: Run): EvmState {
    const call = run('ReviveApi', 'call', ['origin', 'dest', 'value', 'gas_limit', 'storage_deposit_limit', 'input_data'])
    const getStorage = run('ReviveApi', 'get_storage', ['address', 'key'])
    const codeOf = run('ReviveApi', 'code', ['address'])
    return {
        async call(to, data) {
            const {result} = await call([ZERO_H160_ACCOUNT, to, 0n, undefined, undefined, bytes(data)])
            return result.success && (result.value.flags & REVERT) === 0 ? hex(result.value.data) : null
        },
        async code(address) {
            return hex(await codeOf([address]))
        },
        async storage(address, slot) {
            const res = await getStorage([address, slot])
            return res.success && res.value != null ? hex(res.value) : ZERO_WORD
        },
    }
}
